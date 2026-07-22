import { z } from "zod";

import { LABEL_COLOR_PALETTE } from "@/lib/labels";

export const BillingCycleEnum = z.enum(["MONTHLY", "YEARLY"]);
export const CurrencyEnum = z.enum(["JPY", "USD"]);

const priceFieldsSchema = z
  .object({
    amount: z.number().nonnegative("金額は0以上の数値を入力してください"),
    currency: CurrencyEnum.default("JPY"),
    billingCycle: BillingCycleEnum,
    billingInterval: z.number().int().min(1, "1以上の整数を入力してください").default(1),
    billingDay: z.number().int().min(1).max(31),
    billingMonth: z.number().int().min(1).max(12).optional(),
    memo: z.string().optional(),
  })
  .refine((data) => data.billingCycle !== "YEARLY" || data.billingMonth !== undefined, {
    message: "毎年の支払いは支払い月が必須です",
    path: ["billingMonth"],
  });

const labelNamesSchema = z.array(z.string().trim().min(1).max(30)).max(20).optional();

export const CreateSubscriptionSchema = z.object({
  name: z.string().min(1, "サブスク名は必須です").max(100),
  paymentMethodId: z.string().min(1, "支払い方法は必須です"),
  startDate: z.string().min(1, "契約開始日は必須です"),
  endDate: z.string().optional(),
  autoRenew: z.boolean().optional(),
  memo: z.string().optional(),
  price: priceFieldsSchema,
  labels: labelNamesSchema,
});
export type CreateSubscription = z.infer<typeof CreateSubscriptionSchema>;

export const UpdateSubscriptionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  paymentMethodId: z.string().min(1).optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().optional().nullable(),
  autoRenew: z.boolean().optional(),
  memo: z.string().optional(),
  labels: labelNamesSchema,
});
export type UpdateSubscription = z.infer<typeof UpdateSubscriptionSchema>;

export const CreatePriceChangeSchema = priceFieldsSchema.and(
  z.object({
    effectiveFrom: z.string().min(1, "適用開始日は必須です"),
  })
);
export type CreatePriceChange = z.infer<typeof CreatePriceChangeSchema>;

export const UpdatePriceChangeSchema = z
  .object({
    amount: z.number().nonnegative().optional(),
    currency: CurrencyEnum.optional(),
    billingCycle: BillingCycleEnum.optional(),
    billingInterval: z.number().int().min(1, "1以上の整数を入力してください").optional(),
    billingDay: z.number().int().min(1).max(31).optional(),
    billingMonth: z.number().int().min(1).max(12).optional().nullable(),
    effectiveFrom: z.string().min(1).optional(),
    memo: z.string().optional(),
  });
export type UpdatePriceChange = z.infer<typeof UpdatePriceChangeSchema>;

export const CreatePaymentMethodSchema = z.object({
  name: z.string().min(1, "支払い方法名は必須です").max(50),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});
export type CreatePaymentMethod = z.infer<typeof CreatePaymentMethodSchema>;
export const UpdatePaymentMethodSchema = CreatePaymentMethodSchema.partial();

const labelColorSchema = z.enum(LABEL_COLOR_PALETTE, {
  message: "用意された16色から選択してください",
});

export const UpdateLabelSchema = z.object({
  name: z.string().trim().min(1, "ラベル名は必須です").max(30).optional(),
  color: labelColorSchema.optional(),
});
export type UpdateLabel = z.infer<typeof UpdateLabelSchema>;

export const BonusPeriodSchema = z.object({
  startDate: z.string().min(1, "開始日は必須です"),
  targetAmount: z.number().positive("正の数値を入力してください").default(1000000),
  bonusPoints: z.number().int().nonnegative("0以上の整数を入力してください").default(10000),
  pointEarnRate: z.number().min(0, "0以上を入力してください").max(1, "1以下(小数)で入力してください").default(0.005),
});
export type BonusPeriodInput = z.infer<typeof BonusPeriodSchema>;

export const CreateBonusSpendEntrySchema = z.object({
  recordedAt: z.string().min(1, "記録日は必須です"),
  cumulativeAmount: z.number().nonnegative("0以上の数値を入力してください"),
  memo: z.string().max(200).optional(),
});
export type CreateBonusSpendEntry = z.infer<typeof CreateBonusSpendEntrySchema>;

export const UpdateBonusSpendEntrySchema = CreateBonusSpendEntrySchema.partial();
export type UpdateBonusSpendEntry = z.infer<typeof UpdateBonusSpendEntrySchema>;

export const CardBrandEnum = z.enum(["VISA", "MASTERCARD", "JCB", "AMEX", "DINERS", "OTHER"]);
export const CardUsageStatusEnum = z.enum([
  "MAIN",
  "SUB",
  "HOLDING_ONLY",
  "CONSIDERING_CANCELLATION",
  "CANCELLED",
]);

export const CreateCreditCardSchema = z.object({
  name: z.string().min(1, "カード名は必須です").max(50),
  displayOrder: z.number().int().optional(),
  brand: CardBrandEnum,
  usageStatus: CardUsageStatusEnum.optional(),
  pointRate: z.string().max(50).optional(),
  billingDay: z.number().int().min(1).max(31).optional(),
  billingAccount: z.string().max(100).optional(),
  annualFee: z.number().nonnegative().optional(),
  creditLimit: z.number().nonnegative().optional(),
  benefits: z.string().optional(),
  memo: z.string().optional(),
});
export type CreateCreditCard = z.infer<typeof CreateCreditCardSchema>;
export const UpdateCreditCardSchema = CreateCreditCardSchema.partial();
export type UpdateCreditCard = z.infer<typeof UpdateCreditCardSchema>;
