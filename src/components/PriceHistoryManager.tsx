"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Card, CardContent } from "@/components/ui/card";
import { convertToJpy, formatBillingDay, getMonthlyAmount } from "@/lib/billing";
import type { SubscriptionPriceDTO } from "@/types";

const CURRENCY_LABEL: Record<"JPY" | "USD", string> = { JPY: "円", USD: "ドル" };

const priceFormSchema = z
  .object({
    amount: z.number().positive("金額は0より大きい数値が必須です"),
    currency: z.enum(["JPY", "USD"]),
    billingCycle: z.enum(["MONTHLY", "YEARLY"]),
    billingDay: z.number().int().min(1, "1〜31で入力してください").max(31, "1〜31で入力してください"),
    billingMonth: z.number().int().min(1).max(12).optional(),
    effectiveFrom: z.string().min(1, "適用開始日は必須です"),
  })
  .refine((data) => data.billingCycle !== "YEARLY" || data.billingMonth !== undefined, {
    message: "毎年の支払いは支払い月が必須です",
    path: ["billingMonth"],
  });
type PriceFormValues = z.infer<typeof priceFormSchema>;

function toDateInputValue(iso: string): string {
  return format(new Date(iso), "yyyy-MM-dd");
}

export function PriceHistoryManager({
  subscriptionId,
  priceChanges: initialPriceChanges,
  usdJpyRate,
}: {
  subscriptionId: string;
  priceChanges: SubscriptionPriceDTO[];
  usdJpyRate: number | null;
}) {
  const router = useRouter();
  const [priceChanges, setPriceChanges] = useState(
    [...initialPriceChanges].sort(
      (a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime()
    )
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionPriceDTO | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PriceFormValues>({
    resolver: zodResolver(priceFormSchema),
    defaultValues: {
      amount: undefined,
      currency: "JPY",
      billingCycle: "MONTHLY",
      billingDay: 1,
      billingMonth: undefined,
      effectiveFrom: toDateInputValue(new Date().toISOString()),
    },
  });
  const billingCycle = watch("billingCycle");

  function openCreateDialog() {
    setEditing(null);
    reset({
      amount: undefined,
      currency: "JPY",
      billingCycle: "MONTHLY",
      billingDay: 1,
      billingMonth: undefined,
      effectiveFrom: toDateInputValue(new Date().toISOString()),
    });
    setDialogOpen(true);
  }

  function openEditDialog(priceChange: SubscriptionPriceDTO) {
    setEditing(priceChange);
    reset({
      amount: Number(priceChange.amount),
      currency: priceChange.currency,
      billingCycle: priceChange.billingCycle,
      billingDay: priceChange.billingDay,
      billingMonth: priceChange.billingMonth ?? undefined,
      effectiveFrom: toDateInputValue(priceChange.effectiveFrom),
    });
    setDialogOpen(true);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/subscriptions/${subscriptionId}/price-changes/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error ?? "削除に失敗しました");
        return;
      }
      setPriceChanges((prev) => prev.filter((p) => p.id !== id));
      toast.success("削除しました");
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  async function onSubmit(values: PriceFormValues) {
    const payload = {
      amount: values.amount,
      currency: values.currency,
      billingCycle: values.billingCycle,
      billingDay: values.billingDay,
      billingMonth: values.billingCycle === "YEARLY" ? values.billingMonth : undefined,
      effectiveFrom: new Date(values.effectiveFrom).toISOString(),
    };

    const url = editing
      ? `/api/subscriptions/${subscriptionId}/price-changes/${editing.id}`
      : `/api/subscriptions/${subscriptionId}/price-changes`;

    const res = await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "保存に失敗しました");
      return;
    }

    const saved: SubscriptionPriceDTO = await res.json();
    setPriceChanges((prev) => {
      const next = editing ? prev.map((p) => (p.id === saved.id ? saved : p)) : [...prev, saved];
      return next.sort(
        (a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime()
      );
    });
    toast.success(editing ? "料金を更新しました" : "料金変更を追加しました");
    setDialogOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">料金の変更履歴</h2>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="size-4" />
              料金変更を追加
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "料金を編集" : "料金変更を追加"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-[1fr_auto] gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="price-amount">金額</Label>
                  <Input
                    id="price-amount"
                    type="number"
                    step="1"
                    {...register("amount", { valueAsNumber: true })}
                  />
                  {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="price-currency">通貨</Label>
                  <Controller
                    control={control}
                    name="currency"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="price-currency" className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="JPY">円</SelectItem>
                          <SelectItem value="USD">ドル</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="price-billingCycle">支払い周期</Label>
                <Controller
                  control={control}
                  name="billingCycle"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="price-billingCycle" className="w-full">
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
                    <Label htmlFor="price-billingMonth">支払い月</Label>
                    <Input
                      id="price-billingMonth"
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
                  <Label htmlFor="price-billingDay">支払い日</Label>
                  <Input
                    id="price-billingDay"
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
                <Label htmlFor="price-effectiveFrom">この金額の適用開始日</Label>
                <Input id="price-effectiveFrom" type="date" {...register("effectiveFrom")} />
                {errors.effectiveFrom && (
                  <p className="text-sm text-destructive">{errors.effectiveFrom.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {editing ? "更新する" : "追加する"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {priceChanges.map((priceChange, index) => (
          <Card key={priceChange.id}>
            <CardContent className="flex items-center gap-3">
              <div className="flex-1">
                <p className="font-medium">
                  {Number(priceChange.amount).toLocaleString()} {CURRENCY_LABEL[priceChange.currency]}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    (月あたり {Math.round(getMonthlyAmount({
                      amount: Number(priceChange.amount),
                      billingCycle: priceChange.billingCycle,
                    })).toLocaleString()} {CURRENCY_LABEL[priceChange.currency]}
                    {priceChange.currency === "USD" &&
                      (() => {
                        const jpy = convertToJpy(Number(priceChange.amount), priceChange.currency, usdJpyRate);
                        return jpy !== null ? ` / 約${Math.round(jpy).toLocaleString()}円` : "";
                      })()}
                    )
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatBillingDay(priceChange)} ・ {format(new Date(priceChange.effectiveFrom), "yyyy年MM月dd日")}
                  {index === 0 ? "〜(現在)" : "〜"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openEditDialog(priceChange)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="編集"
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(priceChange.id)}
                disabled={priceChanges.length <= 1 || deletingId === priceChange.id}
                className="text-muted-foreground hover:text-destructive disabled:pointer-events-none disabled:opacity-30"
                aria-label="削除"
              >
                {deletingId === priceChange.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
