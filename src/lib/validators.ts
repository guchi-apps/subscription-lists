import { z } from "zod";

export const BillingCycleEnum = z.enum(["MONTHLY", "YEARLY"]);
export const CurrencyEnum = z.enum(["JPY", "USD"]);

const priceFieldsSchema = z
  .object({
    amount: z.number().positive("金額は0より大きい数値が必須です"),
    currency: CurrencyEnum.default("JPY"),
    billingCycle: BillingCycleEnum,
    billingInterval: z.number().int().min(1, "1以上の整数を入力してください").default(1),
    billingDay: z.number().int().min(1).max(31),
    billingMonth: z.number().int().min(1).max(12).optional(),
  })
  .refine((data) => data.billingCycle !== "YEARLY" || data.billingMonth !== undefined, {
    message: "毎年の支払いは支払い月が必須です",
    path: ["billingMonth"],
  });

export const CreateSubscriptionSchema = z.object({
  name: z.string().min(1, "サブスク名は必須です").max(100),
  paymentMethodId: z.string().min(1, "支払い方法は必須です"),
  startDate: z.string().min(1, "契約開始日は必須です"),
  endDate: z.string().optional(),
  memo: z.string().optional(),
  price: priceFieldsSchema,
});
export type CreateSubscription = z.infer<typeof CreateSubscriptionSchema>;

export const UpdateSubscriptionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  paymentMethodId: z.string().min(1).optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().optional().nullable(),
  memo: z.string().optional(),
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
    amount: z.number().positive().optional(),
    currency: CurrencyEnum.optional(),
    billingCycle: BillingCycleEnum.optional(),
    billingInterval: z.number().int().min(1, "1以上の整数を入力してください").optional(),
    billingDay: z.number().int().min(1).max(31).optional(),
    billingMonth: z.number().int().min(1).max(12).optional().nullable(),
    effectiveFrom: z.string().min(1).optional(),
  });
export type UpdatePriceChange = z.infer<typeof UpdatePriceChangeSchema>;

export const CreatePaymentMethodSchema = z.object({
  name: z.string().min(1, "支払い方法名は必須です").max(50),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});
export type CreatePaymentMethod = z.infer<typeof CreatePaymentMethodSchema>;
export const UpdatePaymentMethodSchema = CreatePaymentMethodSchema.partial();
