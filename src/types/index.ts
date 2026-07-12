// API レスポンスは Prisma の `Decimal` フィールドを JSON 化する際に文字列になる
// （Decimal.js の toJSON 実装のため）。クライアント側では Number() で変換して使う。

export type BillingCycle = "MONTHLY" | "YEARLY";

export type SubscriptionDTO = {
  id: string;
  userId: string;
  name: string;
  amount: string;
  billingCycle: BillingCycle;
  billingDay: number;
  billingMonth: number | null;
  paymentMethodId: string;
  paymentMethod: MasterDTO;
  contractMethodId: string;
  contractMethod: MasterDTO;
  startDate: string;
  cancelledAt: string | null;
  memo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
