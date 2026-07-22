// API レスポンスは Prisma の `Decimal` フィールドを JSON 化する際に文字列になる
// （Decimal.js の toJSON 実装のため）。クライアント側では Number() で変換して使う。

export type BillingCycle = "MONTHLY" | "YEARLY";
export type Currency = "JPY" | "USD";

export type SubscriptionPriceDTO = {
  id: string;
  subscriptionId: string;
  amount: string;
  currency: Currency;
  billingCycle: BillingCycle;
  billingInterval: number;
  billingDay: number;
  billingMonth: number | null;
  effectiveFrom: string;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SubscriptionDTO = {
  id: string;
  userId: string;
  name: string;
  paymentMethodId: string;
  paymentMethod: MasterDTO;
  startDate: string;
  endDate: string | null;
  autoRenew: boolean;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
  priceChanges: SubscriptionPriceDTO[];
  labels: LabelDTO[];
};

export type MasterDTO = {
  id: string;
  userId: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LabelDTO = {
  id: string;
  userId: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
};

export type BonusSpendEntryDTO = {
  id: string;
  periodId: string;
  recordedAt: string;
  cumulativeAmount: string;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BonusPeriodDTO = {
  id: string;
  userId: string;
  startDate: string;
  targetAmount: string;
  bonusPoints: number;
  pointEarnRate: string;
  createdAt: string;
  updatedAt: string;
  entries: BonusSpendEntryDTO[];
};

export type CardBrand = "VISA" | "MASTERCARD" | "JCB" | "AMEX" | "DINERS" | "OTHER";
export type CardUsageStatus =
  | "MAIN"
  | "SUB"
  | "HOLDING_ONLY"
  | "CONSIDERING_CANCELLATION"
  | "CANCELLED";

export type CreditCardDTO = {
  id: string;
  userId: string;
  name: string;
  displayOrder: number;
  brand: CardBrand;
  usageStatus: CardUsageStatus;
  pointRate: string | null;
  billingDay: number | null;
  billingAccount: string | null;
  annualFee: string | null;
  creditLimit: string | null;
  benefits: string | null;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
};
