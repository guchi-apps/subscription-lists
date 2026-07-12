import { endOfMonth, isBefore, startOfDay } from "date-fns";

export type BillingCycle = "MONTHLY" | "YEARLY";
export type Currency = "JPY" | "USD";

export interface BillingInfo {
  amount: number;
  billingCycle: BillingCycle;
  billingInterval?: number;
}

/** 支払い周期を月数に換算する(例: MONTHLY×3=3ヶ月ごと→3、YEARLY×1=毎年→12) */
function getCycleMonths(billingCycle: BillingCycle, billingInterval: number): number {
  return billingCycle === "YEARLY" ? billingInterval * 12 : billingInterval;
}

/** 月当たりの金額。1回あたりの請求額を周期の月数で割って算出する(通貨は変換しない) */
export function getMonthlyAmount({ amount, billingCycle, billingInterval = 1 }: BillingInfo): number {
  return amount / getCycleMonths(billingCycle, billingInterval);
}

/** 指定した通貨の金額を USD/JPY レートで日本円に換算する。JPY はそのまま、レート未取得時は null */
export function convertToJpy(amount: number, currency: Currency, usdJpyRate: number | null): number | null {
  if (currency === "JPY") return amount;
  return usdJpyRate === null ? null : amount * usdJpyRate;
}

export const CURRENCY_LABEL: Record<Currency, string> = { JPY: "円", USD: "ドル" };

/** 金額を「1,000 円」のように整形し、外貨はおよその円換算を括弧書きで併記する */
export function formatAmountWithJpy(amount: number, currency: Currency, usdJpyRate: number | null): string {
  const base = `${amount.toLocaleString()} ${CURRENCY_LABEL[currency]}`;
  if (currency === "JPY") return base;
  const jpy = convertToJpy(amount, currency, usdJpyRate);
  return jpy !== null ? `${base} (約${Math.round(jpy).toLocaleString()}円)` : base;
}

export function formatBillingDay({
  billingCycle,
  billingDay,
  billingMonth,
  billingInterval = 1,
}: {
  billingCycle: BillingCycle;
  billingDay: number;
  billingMonth?: number | null;
  billingInterval?: number;
}): string {
  if (billingCycle === "YEARLY") {
    const cyclePrefix = billingInterval === 1 ? "毎年" : `${billingInterval}年ごと`;
    return `${cyclePrefix}${billingMonth}月${billingDay}日`;
  }
  const cyclePrefix = billingInterval === 1 ? "毎月" : `${billingInterval}ヶ月ごと`;
  return `${cyclePrefix}${billingDay}日`;
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
  billingInterval?: number;
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
  billingInterval: number;
}

/** 対象年月が、料金改定の適用開始月から billingInterval ヶ月ごとの支払い月かどうか(MONTHLY用) */
function isOnCycleMonth(effectiveFrom: Date, year: number, month: number, billingInterval: number): boolean {
  if (billingInterval <= 1) return true;
  const monthsDiff = (year - effectiveFrom.getFullYear()) * 12 + (month - (effectiveFrom.getMonth() + 1));
  return monthsDiff % billingInterval === 0;
}

/** 対象年が、料金改定の適用開始年から billingInterval 年ごとの支払い年かどうか(YEARLY用) */
function isOnCycleYear(effectiveFrom: Date, year: number, billingInterval: number): boolean {
  if (billingInterval <= 1) return true;
  return (year - effectiveFrom.getFullYear()) % billingInterval === 0;
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
    const billingInterval = priceChange.billingInterval ?? 1;

    if (priceChange.billingCycle === "YEARLY") {
      if (priceChange.billingMonth !== month) return;
      if (!isOnCycleYear(priceChange.effectiveFrom, year, billingInterval)) return;
    } else if (!isOnCycleMonth(priceChange.effectiveFrom, year, month, billingInterval)) {
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
      billingInterval,
    });
  });

  return result;
}

/** 指定日以降で最も近い支払い予定日を返す(見つからない場合はnull。最大3年先まで探索) */
export function getNextOccurrence(
  sub: SubscriptionOccurrenceInput,
  referenceDate: Date = new Date()
): Occurrence | null {
  const ref = startOfDay(referenceDate);
  let year = ref.getFullYear();
  let month = ref.getMonth() + 1;

  for (let i = 0; i < 36; i++) {
    const occurrences = getOccurrencesInMonth(sub, year, month)
      .filter((o) => !isBefore(o.date, ref))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    if (occurrences.length > 0) return occurrences[0];

    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return null;
}
