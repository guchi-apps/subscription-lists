import { format } from "date-fns";

import {
  convertToJpy,
  getContractStatus,
  getCurrentPrice,
  getMonthlyAmount,
  getNextOccurrence,
  type BillingCycle,
  type ContractStatus,
  type Currency,
  type PriceChangeInput,
} from "@/lib/billing";
import { db } from "@/lib/db";
import { getUsdJpyRate } from "@/lib/exchange-rate";
import { requireInternalApiKey, resolveInternalUserId } from "@/lib/internal-auth";

// AIDEが取得のたびに最新を読む前提のため、キャッシュさせない。
export const dynamic = "force-dynamic";

interface InternalPrice {
  amount: number;
  currency: Currency;
  billingCycle: BillingCycle;
  billingInterval: number;
  billingDay: number;
  billingMonth: number | null;
  effectiveFrom: string;
}

interface InternalSubscription {
  id: string;
  name: string;
  paymentMethod: string;
  labels: string[];
  contractStatus: ContractStatus;
  startDate: string;
  endDate: string | null;
  autoRenew: boolean;
  currentPrice: InternalPrice;
  monthlyAmount: number;
  monthlyAmountJpy: number | null;
  nextPayment: { date: string; amount: number; currency: Currency } | null;
}

/** 日付を YYYY-MM-DD にする。DBの `@db.Date`(UTC 0時)と billing.ts の算出日(ローカル0時)が
 *  混在するため、`toISOString()` ではなく date-fns の `format` で揃える。 */
function toDateString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** 円換算の参考値。円に小数は意味が無いため整数へ丸める(レート未取得なら null) */
function toJpyReference(amount: number, currency: Currency, usdJpyRate: number | null): number | null {
  const jpy = convertToJpy(amount, currency, usdJpyRate);
  return jpy === null ? null : Math.round(jpy);
}

/** `YYYY-MM-DD` を基準日として解釈する。不正な値なら null */
function parseReferenceDate(value: string | null): Date | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * サーバー間(AIDE)から月額固定費と次の支払予定を参照するためのエンドポイント。
 * 月額換算・次回支払日・契約状況は src/lib/billing.ts の既存ロジックで算出して返す
 * (月末クランプ・料金改定の期間切り替え・billingInterval のサイクル判定を呼び出し側で
 * 再実装させないため)。算出の根拠となる料金改定の生の値も currentPrice として併記する。
 */
export async function GET(request: Request) {
  const unauthorized = requireInternalApiKey(request);
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const includeEnded = url.searchParams.get("includeEnded") === "true";

  const referenceDateParam = url.searchParams.get("referenceDate");
  if (referenceDateParam && !parseReferenceDate(referenceDateParam)) {
    return Response.json(
      { error: "referenceDate must be in YYYY-MM-DD format" },
      { status: 400 }
    );
  }
  // 省略時はサーバー時刻。サーバーのTZはUTCのため、日本時間の 00:00-09:00 は前日扱いになる。
  // AIDE側がJSTの日付を明示できるよう referenceDate を受け付けている。
  const referenceDate = parseReferenceDate(referenceDateParam) ?? new Date();

  const userId = await resolveInternalUserId();
  if (!userId) {
    return Response.json({ error: "Target user is not resolvable" }, { status: 500 });
  }

  const rows = await db.subscription.findMany({
    where: { userId },
    include: {
      paymentMethod: { select: { name: true } },
      priceChanges: { orderBy: { effectiveFrom: "asc" } },
      labels: { select: { name: true } },
    },
    orderBy: [{ name: "asc" }],
  });

  const usdJpyRate = await getUsdJpyRate();

  const subscriptions: InternalSubscription[] = [];

  for (const row of rows) {
    // 料金改定が1件も無いと金額を決められない(通常はサブスク作成時に必ず1件作られる)。
    if (row.priceChanges.length === 0) continue;

    const contractStatus = getContractStatus(row.endDate, row.autoRenew, referenceDate);
    if (!includeEnded && contractStatus === "ENDED") continue;

    // Prisma の Decimal は JSON化すると文字列になるため、ここで数値へ寄せる。
    const priceChanges: PriceChangeInput[] = row.priceChanges.map((priceChange) => ({
      amount: Number(priceChange.amount),
      currency: priceChange.currency,
      billingCycle: priceChange.billingCycle,
      billingInterval: priceChange.billingInterval,
      billingDay: priceChange.billingDay,
      billingMonth: priceChange.billingMonth,
      effectiveFrom: priceChange.effectiveFrom,
    }));

    const current = getCurrentPrice(priceChanges, referenceDate);
    const monthlyAmount = getMonthlyAmount({
      amount: current.amount,
      billingCycle: current.billingCycle,
      billingInterval: current.billingInterval,
    });
    const next = getNextOccurrence(
      { startDate: row.startDate, endDate: row.endDate, priceChanges },
      referenceDate
    );

    subscriptions.push({
      id: row.id,
      name: row.name,
      paymentMethod: row.paymentMethod.name,
      labels: row.labels.map((label) => label.name),
      contractStatus,
      startDate: toDateString(row.startDate),
      endDate: row.endDate ? toDateString(row.endDate) : null,
      autoRenew: row.autoRenew,
      currentPrice: {
        amount: current.amount,
        currency: current.currency,
        billingCycle: current.billingCycle,
        billingInterval: current.billingInterval ?? 1,
        billingMonth: current.billingMonth ?? null,
        billingDay: current.billingDay,
        effectiveFrom: toDateString(current.effectiveFrom),
      },
      monthlyAmount,
      monthlyAmountJpy: toJpyReference(monthlyAmount, current.currency, usdJpyRate),
      nextPayment: next
        ? { date: toDateString(next.date), amount: next.amount, currency: next.currency }
        : null,
    });
  }

  // 通貨をまたいで足すと為替次第で意味が変わるため、合計は通貨別に持つ。
  // 円換算した合計は参考値として別フィールドに置き、レート未取得時は null にする。
  const monthlyByCurrency = subscriptions.reduce<Record<string, number>>((totals, sub) => {
    const currency = sub.currentPrice.currency;
    totals[currency] = (totals[currency] ?? 0) + sub.monthlyAmount;
    return totals;
  }, {});

  // 明細の monthlyAmountJpy をそのまま足す(丸める前の値を合計してから丸めると、
  // 明細を足し上げた額と合計が食い違って見えるため)。
  const hasUnconvertible = subscriptions.some((sub) => sub.monthlyAmountJpy === null);
  const monthlyJpy = hasUnconvertible
    ? null
    : subscriptions.reduce((total, sub) => total + (sub.monthlyAmountJpy ?? 0), 0);

  return Response.json({
    generatedAt: new Date().toISOString(),
    referenceDate: toDateString(referenceDate),
    usdJpyRate,
    totals: { monthlyByCurrency, monthlyJpy },
    subscriptions,
  });
}
