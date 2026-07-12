"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { toast } from "sonner";

import { Loader2, Plus } from "lucide-react";

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { MasterDTO, SubscriptionDTO } from "@/types";

const formSchema = z
  .object({
    name: z.string().min(1, "サブスク名は必須です").max(100),
    paymentMethodId: z.string().min(1, "支払い方法を選択してください"),
    startDate: z.string().min(1, "契約開始日は必須です"),
    endDate: z.string().optional(),
    memo: z.string().optional(),
    amount: z.number().nonnegative("金額は0以上の数値を入力してください").optional(),
    currency: z.enum(["JPY", "USD"]).optional(),
    billingCycle: z.enum(["MONTHLY", "YEARLY"]).optional(),
    billingInterval: z.number().int().min(1, "1以上の整数を入力してください").optional(),
    billingDay: z.number().int().min(1, "1〜31で入力してください").max(31, "1〜31で入力してください").optional(),
    billingMonth: z.number().int().min(1).max(12).optional(),
  })
  .refine((data) => data.billingCycle !== "YEARLY" || data.billingMonth !== undefined, {
    message: "毎年の支払いは支払い月が必須です",
    path: ["billingMonth"],
  });

// 新規登録時のみ amount/billingCycle/billingDay を必須にする
const newSubscriptionSchema = formSchema.refine((data) => data.amount !== undefined, {
  message: "金額は必須です",
  path: ["amount"],
});

type SubscriptionFormValues = z.infer<typeof formSchema>;

// 枠で囲む代わりに下線だけで入力欄を区切る、このフォーム専用の見た目
const LINE_INPUT_CLASS =
  "rounded-none border-x-0 border-t-0 border-b border-input bg-transparent px-0 focus-visible:ring-0 focus-visible:border-b-2 focus-visible:border-ring disabled:bg-transparent dark:bg-transparent dark:disabled:bg-transparent";
const LINE_SELECT_TRIGGER_CLASS =
  "rounded-none border-x-0 border-t-0 border-b border-input bg-transparent pl-0 focus-visible:ring-0 focus-visible:border-b-2 focus-visible:border-ring dark:bg-transparent dark:hover:bg-transparent";

const newPaymentMethodSchema = z.object({
  name: z.string().min(1, "支払い方法名は必須です").max(50),
});
type NewPaymentMethodValues = z.infer<typeof newPaymentMethodSchema>;

function toDateInputValue(iso: string): string {
  return format(new Date(iso), "yyyy-MM-dd");
}

export function SubscriptionForm({
  subscription,
  paymentMethods: initialPaymentMethods,
}: {
  subscription?: SubscriptionDTO;
  paymentMethods: MasterDTO[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState(initialPaymentMethods);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isAddingPaymentMethod, setIsAddingPaymentMethod] = useState(false);
  const isEdit = !!subscription;

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SubscriptionFormValues>({
    resolver: zodResolver(
      isEdit ? formSchema : newSubscriptionSchema
    ) as Resolver<SubscriptionFormValues>,
    defaultValues: {
      name: subscription?.name ?? "",
      paymentMethodId: subscription?.paymentMethodId ?? paymentMethods[0]?.id ?? "",
      startDate: subscription
        ? toDateInputValue(subscription.startDate)
        : toDateInputValue(new Date().toISOString()),
      endDate: subscription?.endDate ? toDateInputValue(subscription.endDate) : "",
      memo: subscription?.memo ?? "",
      amount: undefined,
      currency: "JPY",
      billingCycle: "MONTHLY",
      billingInterval: 1,
      billingDay: 1,
      billingMonth: undefined,
    },
  });

  const billingCycle = watch("billingCycle");

  const {
    register: registerNewPaymentMethod,
    handleSubmit: handleSubmitNewPaymentMethod,
    reset: resetNewPaymentMethod,
    formState: { errors: newPaymentMethodErrors },
  } = useForm<NewPaymentMethodValues>({
    resolver: zodResolver(newPaymentMethodSchema),
    defaultValues: { name: "" },
  });

  async function onSubmitNewPaymentMethod(values: NewPaymentMethodValues) {
    setIsAddingPaymentMethod(true);
    try {
      const res = await fetch("/api/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        toast.error("支払い方法の追加に失敗しました");
        return;
      }
      const created: MasterDTO = await res.json();
      setPaymentMethods((prev) => [...prev, created]);
      setValue("paymentMethodId", created.id);
      toast.success("支払い方法を追加しました");
      resetNewPaymentMethod();
      setAddDialogOpen(false);
    } finally {
      setIsAddingPaymentMethod(false);
    }
  }

  async function onSubmit(values: SubscriptionFormValues) {
    setIsSubmitting(true);
    try {
      const basePayload = {
        name: values.name,
        paymentMethodId: values.paymentMethodId,
        startDate: new Date(values.startDate).toISOString(),
        endDate: values.endDate ? new Date(values.endDate).toISOString() : undefined,
        memo: values.memo || undefined,
      };

      const payload = isEdit
        ? basePayload
        : {
            ...basePayload,
            price: {
              amount: values.amount,
              currency: values.currency,
              billingCycle: values.billingCycle,
              billingInterval: values.billingInterval,
              billingDay: values.billingDay,
              billingMonth: values.billingMonth,
            },
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
      router.push(subscription ? `/subscriptions/${subscription.id}/edit` : "/subscriptions");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl space-y-6">
      <div className="space-y-1.5">
        <Label htmlFor="name">サブスク名</Label>
        <Input id="name" className={LINE_INPUT_CLASS} {...register("name")} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      {!isEdit && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="amount">金額</Label>
            <div
              className={`flex items-center border-b transition-colors focus-within:border-b-2 focus-within:border-ring ${
                errors.amount ? "border-destructive" : "border-input"
              }`}
            >
              <Controller
                control={control}
                name="currency"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="currency"
                      aria-label="通貨"
                      className="w-14 shrink-0 rounded-none border-0 bg-transparent pl-0 focus-visible:ring-0 dark:bg-transparent dark:hover:bg-transparent"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="JPY">¥</SelectItem>
                      <SelectItem value="USD">$</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <Input
                id="amount"
                type="number"
                step="1"
                className="flex-1 rounded-none border-0 bg-transparent px-0 focus-visible:ring-0 dark:bg-transparent"
                {...register("amount", { valueAsNumber: true })}
              />
            </div>
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="billingInterval">支払い周期</Label>
            <div className="flex items-center gap-2">
              <Input
                id="billingInterval"
                type="number"
                min={1}
                step={1}
                className={`${LINE_INPUT_CLASS} w-20`}
                {...register("billingInterval", { valueAsNumber: true })}
              />
              <Controller
                control={control}
                name="billingCycle"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="billingCycle" className={`${LINE_SELECT_TRIGGER_CLASS} w-full`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">ヶ月ごと</SelectItem>
                      <SelectItem value="YEARLY">年ごと</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            {errors.billingInterval && (
              <p className="text-sm text-destructive">{errors.billingInterval.message}</p>
            )}
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
                  className={LINE_INPUT_CLASS}
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
                className={LINE_INPUT_CLASS}
                {...register("billingDay", { valueAsNumber: true })}
              />
              {errors.billingDay && (
                <p className="text-sm text-destructive">{errors.billingDay.message}</p>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            登録後に料金が変わった場合は、編集画面の「料金の変更履歴」から追加できます。
          </p>
        </>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="paymentMethodId">支払い方法</Label>
          <Dialog
            open={addDialogOpen}
            onOpenChange={(open) => {
              setAddDialogOpen(open);
              if (!open) resetNewPaymentMethod();
            }}
          >
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Plus className="size-3.5" />
                新しく追加
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>支払い方法を追加</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={handleSubmitNewPaymentMethod(onSubmitNewPaymentMethod)}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="newPaymentMethodName">名称</Label>
                  <Input
                    id="newPaymentMethodName"
                    className={LINE_INPUT_CLASS}
                    {...registerNewPaymentMethod("name")}
                  />
                  {newPaymentMethodErrors.name && (
                    <p className="text-sm text-destructive">
                      {newPaymentMethodErrors.name.message}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isAddingPaymentMethod}>
                  {isAddingPaymentMethod && <Loader2 className="size-4 animate-spin" />}
                  追加する
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <Controller
          control={control}
          name="paymentMethodId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="paymentMethodId" className={`${LINE_SELECT_TRIGGER_CLASS} w-full`}>
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
          <p className="text-xs text-muted-foreground">
            まだ支払い方法が登録されていません。「新しく追加」から登録してください。
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="startDate">契約開始日</Label>
        <Input id="startDate" type="date" className={LINE_INPUT_CLASS} {...register("startDate")} />
        {errors.startDate && <p className="text-sm text-destructive">{errors.startDate.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="endDate">契約終了日(自動更新中・未定なら空欄)</Label>
        <Input id="endDate" type="date" className={LINE_INPUT_CLASS} {...register("endDate")} />
        <p className="text-xs text-muted-foreground">
          未来の日付を入れると「解約予定」、過去の日付なら「解約済み」として一覧に表示されます。
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="memo">メモ</Label>
        <Textarea id="memo" className={LINE_INPUT_CLASS} {...register("memo")} />
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
