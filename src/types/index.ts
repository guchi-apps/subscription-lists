// API レスポンスは Prisma の `Decimal` フィールドを JSON 化する際に文字列になる
// （Decimal.js の toJSON 実装のため）。クライアント側では Number() で変換して使う。

export type BillingCycle = "MONTHLY" | "YEARLY";

export type SubscriptionPriceDTO = {
  id: string;
  subscriptionId: string;
  amount: string;
  billingCycle: BillingCycle;
  billingDay: number;
  billingMonth: number | null;
  effectiveFrom: string;
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
  memo: string | null;
  createdAt: string;
  updatedAt: string;
  priceChanges: SubscriptionPriceDTO[];
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
