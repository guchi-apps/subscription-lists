import { addYears, differenceInCalendarDays, startOfDay } from "date-fns";

export function getPeriodEndDate(startDate: Date): Date {
  return addYears(startOfDay(startDate), 1);
}

export function getDaysRemaining(startDate: Date, today: Date = new Date()): number {
  const days = differenceInCalendarDays(getPeriodEndDate(startDate), startOfDay(today));
  return Math.max(0, days);
}

export function getDaysElapsed(startDate: Date, today: Date = new Date()): number {
  const days = differenceInCalendarDays(startOfDay(today), startOfDay(startDate));
  return Math.max(0, days);
}

export function getRemainingAmount(currentAmount: number, targetAmount: number): number {
  return Math.max(0, targetAmount - currentAmount);
}

export function isBonusEarned(currentAmount: number, targetAmount: number): boolean {
  return currentAmount >= targetAmount;
}

/** 通常ポイント。利用額 × 還元率(例: 0.005 = 0.5%)を切り捨て */
export function getRegularPoints(currentAmount: number, pointEarnRate: number): number {
  return Math.floor(currentAmount * pointEarnRate);
}

export function getTotalPoints(
  currentAmount: number,
  targetAmount: number,
  bonusPoints: number,
  pointEarnRate: number
): number {
  const regularPoints = getRegularPoints(currentAmount, pointEarnRate);
  return isBonusEarned(currentAmount, targetAmount) ? regularPoints + bonusPoints : regularPoints;
}

/** 残り日数で目標に届かせるための1日あたり必要利用額。達成済みなら0、期間終了かつ未達成ならnull */
export function getRequiredDailyPace(remainingAmount: number, daysRemaining: number): number | null {
  if (remainingAmount <= 0) return 0;
  if (daysRemaining <= 0) return null;
  return remainingAmount / daysRemaining;
}

/** プログレスバー用に0〜1へclamp */
export function getProgressRatio(currentAmount: number, targetAmount: number): number {
  if (targetAmount <= 0) return 0;
  return Math.min(1, Math.max(0, currentAmount / targetAmount));
}

/** 期間内の日付経過割合(0〜1)。経過日数 / (経過日数 + 残り日数) */
export function getDateProgressRatio(daysElapsed: number, daysRemaining: number): number {
  const totalDays = daysElapsed + daysRemaining;
  if (totalDays <= 0) return 0;
  return Math.min(1, Math.max(0, daysElapsed / totalDays));
}

export type BonusStatus = "IN_PROGRESS" | "EARNED" | "MISSED";

export function getBonusStatus(currentAmount: number, targetAmount: number, daysRemaining: number): BonusStatus {
  if (isBonusEarned(currentAmount, targetAmount)) return "EARNED";
  if (daysRemaining <= 0) return "MISSED";
  return "IN_PROGRESS";
}

export interface BonusSpendEntryInput {
  recordedAt: Date;
  cumulativeAmount: number;
}

/** 挿入順に依存せず、recordedAt が最も新しいエントリを返す(遡って記録した場合に対応) */
export function getLatestEntry<T extends BonusSpendEntryInput>(entries: T[]): T | null {
  if (entries.length === 0) return null;
  return entries.reduce((latest, entry) => (entry.recordedAt > latest.recordedAt ? entry : latest));
}

export interface BonusPeriodInput {
  startDate: Date;
  targetAmount: number;
  bonusPoints: number;
  pointEarnRate: number;
}

export interface BonusSummary {
  periodEndDate: Date;
  daysRemaining: number;
  daysElapsed: number;
  currentAmount: number;
  remainingAmount: number;
  regularPoints: number;
  totalPoints: number;
  bonusEarned: boolean;
  requiredDailyPace: number | null;
  progressRatio: number;
  dateProgressRatio: number;
  status: BonusStatus;
}

export function getBonusSummary(
  period: BonusPeriodInput,
  currentAmount: number,
  today: Date = new Date()
): BonusSummary {
  const daysRemaining = getDaysRemaining(period.startDate, today);
  const remainingAmount = getRemainingAmount(currentAmount, period.targetAmount);

  return {
    periodEndDate: getPeriodEndDate(period.startDate),
    daysRemaining,
    daysElapsed: getDaysElapsed(period.startDate, today),
    currentAmount,
    remainingAmount,
    regularPoints: getRegularPoints(currentAmount, period.pointEarnRate),
    totalPoints: getTotalPoints(currentAmount, period.targetAmount, period.bonusPoints, period.pointEarnRate),
    bonusEarned: isBonusEarned(currentAmount, period.targetAmount),
    requiredDailyPace: getRequiredDailyPace(remainingAmount, daysRemaining),
    progressRatio: getProgressRatio(currentAmount, period.targetAmount),
    dateProgressRatio: getDateProgressRatio(getDaysElapsed(period.startDate, today), daysRemaining),
    status: getBonusStatus(currentAmount, period.targetAmount, daysRemaining),
  };
}
