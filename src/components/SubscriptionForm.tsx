"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MasterDTO, SubscriptionDTO } from "@/types";

const subscriptionFormSchema = z
  .object({
    name: z.string().min(1, "サブスク名は必須です").max(100),
    amount: z.number().positive("金額は0より大きい数値が必須です"),
    billingCycle: z.enum(["MONTHLY", "YEARLY"]),
    billingDay: z
      .number()
      .int()
      .min(1, "1〜31で入力してください")
      .max(31, "1〜31で入力してください"),
    billingMonth: z.number().int().min(1).max(12).optional(),
    paymentMethodId: z.string().min(1, "支払い方法を選択してください"),
    contractMethodId: z.string().min(1, "契約方法を選択してください"),
    startDate: z.string().min(1, "契約開始日は必須です"),
    cancelledAt: z.string().optional(),
    memo: z.string().optional(),
  })
  .refine((data) => data.billingCycle !== "YEARLY" || data.billingMonth !== undefined, {
    message: "毎年の支払いは支払い月が必須です",
    path: ["billingMonth"],
  });

type SubscriptionFormValues = z.infer<typeof subscriptionFormSchema>;

function toDateInputValue(iso: string): string {
  return format(new Date(iso), "yyyy-MM-dd");
}

export function SubscriptionForm({
  subscription,
  paymentMethods,
  contractMethods,
}: {
  subscription?: SubscriptionDTO;
  paymentMethods: MasterDTO[];
  contractMethods: MasterDTO[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: {
      name: subscription?.name ?? "",
      amount: subscription ? Number(subscription.amount) : undefined,
      billingCycle: subscription?.billingCycle ?? "MONTHLY",
      billingDay: subscription?.billingDay ?? 1,
      billingMonth: subscription?.billingMonth ?? undefined,
      paymentMethodId: subscription?.paymentMethodId ?? paymentMethods[0]?.id ?? "",
      contractMethodId: subscription?.contractMethodId ?? contractMethods[0]?.id ?? "",
      startDate: subscription
        ? toDateInputValue(subscription.startDate)
        : toDateInputValue(new Date().toISOString()),
      cancelledAt: subscription?.cancelledAt ? toDateInputValue(subscription.cancelledAt) : "",
      memo: subscription?.memo ?? "",
    },
  });

  const billingCycle = watch("billingCycle");

  async function onSubmit(values: SubscriptionFormValues) {
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        startDate: new Date(values.startDate).toISOString(),
        cancelledAt: values.cancelledAt ? new Date(values.cancelledAt).toISOString() : undefined,
        memo: values.memo || undefined,
      };

      const res = await fetch(
        subscription ? `/api/subscriptions/${subscription.id}` : "/api/subscriptions",
        {
          method: subscription ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        toast.error("保存に失敗しました");
        return;
      }

      toast.success(subscription ? "サブスクを更新しました" : "サブスクを登録しました");
      router.push("/subscriptions");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl space-y-6">
      <div className="space-y-1.5">
        <Label htmlFor="name">サブスク名</Label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="amount">金額(円)</Label>
        <Input id="amount" type="number" step="1" {...register("amount", { valueAsNumber: true })} />
        {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="billingCycle">支払い周期</Label>
        <Controller
          control={control}
          name="billingCycle"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="billingCycle" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MONTHLY">毎月</SelectItem>
                <SelectItem value="YEARLY">毎年</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {billingCycle === "YEARLY" && (
          <div className="space-y-1.5">
            <Label htmlFor="billingMonth">支払い月</Label>
            <Input
              id="billingMonth"
              type="number"
              min={1}
              max={12}
              {...register("billingMonth", { valueAsNumber: true })}
            />
            {errors.billingMonth && (
              <p className="text-sm text-destructive">{errors.billingMonth.message}</p>
            )}
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="billingDay">支払い日</Label>
          <Input
            id="billingDay"
            type="number"
            min={1}
            max={31}
            {...register("billingDay", { valueAsNumber: true })}
          />
          {errors.billingDay && (
            <p className="text-sm text-destructive">{errors.billingDay.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="paymentMethodId">支払い方法</Label>
        <Controller
          control={control}
          name="paymentMethodId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="paymentMethodId" className="w-full">
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((pm) => (
                  <SelectItem key={pm.id} value={pm.id}>
                    {pm.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.paymentMethodId && (
          <p className="text-sm text-destructive">{errors.paymentMethodId.message}</p>
        )}
        {paymentMethods.length === 0 && (
          <p className="text-xs text-muted-foreground">設定画面から支払い方法を登録してください。</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contractMethodId">契約方法</Label>
        <Controller
          control={control}
          name="contractMethodId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="contractMethodId" className="w-full">
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                {contractMethods.map((cm) => (
                  <SelectItem key={cm.id} value={cm.id}>
                    {cm.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.contractMethodId && (
          <p className="text-sm text-destructive">{errors.contractMethodId.message}</p>
        )}
        {contractMethods.length === 0 && (
          <p className="text-xs text-muted-foreground">設定画面から契約方法を登録してください。</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="startDate">契約開始日</Label>
        <Input id="startDate" type="date" {...register("startDate")} />
        {errors.startDate && <p className="text-sm text-destructive">{errors.startDate.message}</p>}
      </div>

      {subscription && (
        <div className="space-y-1.5">
          <Label htmlFor="cancelledAt">解約日(継続中の場合は空欄)</Label>
          <Input id="cancelledAt" type="date" {...register("cancelledAt")} />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="memo">メモ</Label>
        <Textarea id="memo" {...register("memo")} />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {subscription ? "更新する" : "登録する"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          キャンセル
        </Button>
      </div>
    </form>
  );
}
