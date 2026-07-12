import { z } from "zod";

export const BillingCycleEnum = z.enum(["MONTHLY", "YEARLY"]);

export const CreateSubscriptionSchema = z
  .object({
    name: z.string().min(1, "サブスク名は必須です").max(100),
    amount: z.number().positive("金額は0より大きい数値が必須です"),
    billingCycle: BillingCycleEnum,
    billingDay: z.number().int().min(1).max(31),
    billingMonth: z.number().int().min(1).max(12).optional(),
    paymentMethodId: z.string().min(1, "支払い方法は必須です"),
    contractMethodId: z.string().min(1, "契約方法は必須です"),
    startDate: z.string().min(1, "契約開始日は必須です"),
    cancelledAt: z.string().optional(),
    memo: z.string().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => data.billingCycle !== "YEARLY" || data.billingMonth !== undefined, {
    message: "毎年の支払いは支払い月が必須です",
    path: ["billingMonth"],
  });
export type CreateSubscription = z.infer<typeof CreateSubscriptionSchema>;
export const UpdateSubscriptionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  amount: z.number().positive().optional(),
  billingCycle: BillingCycleEnum.optional(),
  billingDay: z.number().int().min(1).max(31).optional(),
  billingMonth: z.number().int().min(1).max(12).optional().nullable(),
  paymentMethodId: z.string().min(1).optional(),
  contractMethodId: z.string().min(1).optional(),
  startDate: z.string().min(1).optional(),
  cancelledAt: z.string().optional().nullable(),
  memo: z.string().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateSubscription = z.infer<typeof UpdateSubscriptionSchema>;

export const CreatePaymentMethodSchema = z.object({
  name: z.string().min(1, "支払い方法名は必須です").max(50),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});
export type CreatePaymentMethod = z.infer<typeof CreatePaymentMethodSchema>;
export const UpdatePaymentMethodSchema = CreatePaymentMethodSchema.partial();

export const CreateContractMethodSchema = z.object({
  name: z.string().min(1, "契約方法名は必須です").max(50),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});
export type CreateContractMethod = z.infer<typeof CreateContractMethodSchema>;
export const UpdateContractMethodSchema = CreateContractMethodSchema.partial();
