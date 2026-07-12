import { endOfMonth, isAfter, isBefore, startOfDay } from "date-fns";

export type BillingCycle = "MONTHLY" | "YEARLY";

export interface BillingInfo {
  amount: number;
  billingCycle: BillingCycle;
}

/** 月当たりの金額。年次は保存せず都度計算する(amount/billingCycleの更新同期漏れを防ぐため) */
export function getMonthlyAmount({ amount, billingCycle }: BillingInfo): number {
  return billingCycle === "YEARLY" ? amount / 12 : amount;
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

export interface SubscriptionOccurrenceInput {
  billingCycle: BillingCycle;
  billingDay: number;
  billingMonth?: number | null;
  startDate: Date;
  cancelledAt?: Date | null;
}

/** 指定した年月に発生する支払い予定日を返す(契約期間内のみ。年次は該当月のみ1件) */
export function getOccurrencesInMonth(
  sub: SubscriptionOccurrenceInput,
  year: number,
  month: number
): Date[] {
  if (sub.billingCycle === "YEARLY" && sub.billingMonth !== month) {
    return [];
  }

  const occurrence = clampToLastDayOfMonth(year, month, sub.billingDay);

  const start = startOfDay(sub.startDate);
  if (isBefore(occurrence, start)) return [];

  if (sub.cancelledAt && isAfter(occurrence, startOfDay(sub.cancelledAt))) {
    return [];
  }

  return [occurrence];
}
