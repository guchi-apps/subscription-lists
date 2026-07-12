import { endOfMonth, isBefore, startOfDay } from "date-fns";

export type BillingCycle = "MONTHLY" | "YEARLY";
export type Currency = "JPY" | "USD";

export interface BillingInfo {
  amount: number;
  billingCycle: BillingCycle;
}

/** 月当たりの金額。年次は amount/billingCycle から都度計算する(通貨は変換しない) */
export function getMonthlyAmount({ amount, billingCycle }: BillingInfo): number {
  return billingCycle === "YEARLY" ? amount / 12 : amount;
}

/** 指定した通貨の金額を USD/JPY レートで日本円に換算する。JPY はそのまま、レート未取得時は null */
export function convertToJpy(amount: number, currency: Currency, usdJpyRate: number | null): number | null {
  if (currency === "JPY") return amount;
  return usdJpyRate === null ? null : amount * usdJpyRate;
}

export function formatBillingDay({
  billingCycle,
  billingDay,
  billingMonth,
}: {
  billingCycle: BillingCycle;
  billingDay: number;
  billingMonth?: number | null;
}): string {
  if (billingCycle === "YEARLY") {
    return `毎年${billingMonth}月${billingDay}日`;
  }
  return `毎月${billingDay}日`;
}

/** 指定した年月における実際の支払日(月末クランプ考慮。例: billingDay=31 の2月は28日/29日) */
export function clampToLastDayOfMonth(year: number, month: number, day: number): Date {
  const lastDay = endOfMonth(new Date(year, month - 1, 1)).getDate();
  return new Date(year, month - 1, Math.min(day, lastDay));
}

// --- 契約状況 ---

export type ContractStatus = "AUTO_RENEWING" | "SCHEDULED_TO_END" | "ENDED";

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  AUTO_RENEWING: "自動更新中",
  SCHEDULED_TO_END: "解約予定",
  ENDED: "解約済み",
};

/** 契約終了日から契約状況を判定する(終了日なし=自動更新中、未来日=解約予定、過去日=解約済み) */
export function getContractStatus(endDate: Date | null, today: Date = new Date()): ContractStatus {
  if (!endDate) return "AUTO_RENEWING";
  const endStart = startOfDay(endDate);
  const todayStart = startOfDay(today);
  if (isBefore(endStart, todayStart)) return "ENDED";
  return "SCHEDULED_TO_END";
}

// --- 料金改定履歴 ---

export interface PriceChangeInput {
  amount: number;
  currency: Currency;
  billingCycle: BillingCycle;
  billingDay: number;
  billingMonth?: number | null;
  effectiveFrom: Date;
}

/**
 * 指定日時点で適用される料金改定を返す(effectiveFrom が referenceDate 以前で最も新しいもの)。
 * priceChanges は空でない前提。
 */
export function getCurrentPrice<T extends PriceChangeInput>(
  priceChanges: T[],
  referenceDate: Date = new Date()
): T {
  const sorted = [...priceChanges].sort(
    (a, b) => a.effectiveFrom.getTime() - b.effectiveFrom.getTime()
  );
  const refStart = startOfDay(referenceDate);
  let current = sorted[0];
  for (const priceChange of sorted) {
    if (!isBefore(refStart, startOfDay(priceChange.effectiveFrom))) {
      current = priceChange;
    }
  }
  return current;
}

export interface SubscriptionOccurrenceInput {
  startDate: Date;
  endDate?: Date | null;
  priceChanges: PriceChangeInput[];
}

export interface Occurrence {
  date: Date;
  amount: number;
  currency: Currency;
  billingCycle: BillingCycle;
}

/**
 * 指定した年月に発生する支払い予定日を返す。料金改定をまたぐ場合は、
 * その時点で有効だった料金改定の金額・周期をもとに発生日を計算する。
 */
export function getOccurrencesInMonth(
  sub: SubscriptionOccurrenceInput,
  year: number,
  month: number
): Occurrence[] {
  const sorted = [...sub.priceChanges].sort(
    (a, b) => a.effectiveFrom.getTime() - b.effectiveFrom.getTime()
  );
  const start = startOfDay(sub.startDate);
  const end = sub.endDate ? startOfDay(sub.endDate) : null;

  const result: Occurrence[] = [];

  sorted.forEach((priceChange, index) => {
    if (priceChange.billingCycle === "YEARLY" && priceChange.billingMonth !== month) {
      return;
    }

    const occurrence = clampToLastDayOfMonth(year, month, priceChange.billingDay);
    const periodStart = startOfDay(priceChange.effectiveFrom);
    const nextChange = sorted[index + 1];
    const periodEnd = nextChange ? startOfDay(nextChange.effectiveFrom) : null;

    if (isBefore(occurrence, start)) return;
    if (isBefore(occurrence, periodStart)) return;
    if (periodEnd && !isBefore(occurrence, periodEnd)) return;
    if (end && isBefore(end, occurrence)) return;

    result.push({
      date: occurrence,
      amount: priceChange.amount,
      currency: priceChange.currency,
      billingCycle: priceChange.billingCycle,
    });
  });

  return result;
}
