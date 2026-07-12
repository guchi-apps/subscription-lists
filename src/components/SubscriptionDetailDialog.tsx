"use client";

import Link from "next/link";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CURRENCY_LABEL,
  convertToJpy,
  formatAmountWithJpy,
  formatBillingDay,
  getMonthlyAmount,
  type ContractStatus,
  type Occurrence,
} from "@/lib/billing";
import { ContractStatusBadge } from "@/components/ContractStatusBadge";
import { LabelBadge } from "@/components/LabelBadge";
import type { SubscriptionDTO } from "@/types";

export function SubscriptionDetailDialog({
  subscription,
  status,
  nextOccurrence,
  usdJpyRate,
  open,
  onOpenChange,
}: {
  subscription: SubscriptionDTO | null;
  status: ContractStatus;
  nextOccurrence: Occurrence | null;
  usdJpyRate: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!subscription) return null;

  const sortedPriceChanges = [...subscription.priceChanges].sort(
    (a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {subscription.name}
            <ContractStatusBadge status={status} />
            {subscription.labels.map((label) => (
              <LabelBadge key={label.id} label={label} />
            ))}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
            <span className="text-muted-foreground">支払い方法</span>
            <span>{subscription.paymentMethod.name}</span>

            <span className="text-muted-foreground">次回の更新日</span>
            <span>{nextOccurrence ? format(nextOccurrence.date, "yyyy年MM月dd日") : "-"}</span>

            <span className="text-muted-foreground">契約開始日</span>
            <span>{format(new Date(subscription.startDate), "yyyy年MM月dd日")}</span>

            {subscription.endDate && (
              <>
                <span className="text-muted-foreground">契約終了日</span>
                <span>{format(new Date(subscription.endDate), "yyyy年MM月dd日")}</span>
              </>
            )}
          </div>

          {subscription.memo && (
            <div className="space-y-1">
              <p className="text-muted-foreground">メモ</p>
              <p className="whitespace-pre-wrap">{subscription.memo}</p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-muted-foreground">料金の変更履歴</p>
            <div className="space-y-1.5">
              {sortedPriceChanges.map((priceChange, index) => {
                const amount = Number(priceChange.amount);
                const monthly = Math.round(
                  getMonthlyAmount({
                    amount,
                    billingCycle: priceChange.billingCycle,
                    billingInterval: priceChange.billingInterval,
                  })
                );
                const jpy = convertToJpy(monthly, priceChange.currency, usdJpyRate);
                return (
                  <div key={priceChange.id} className="rounded-lg border p-2">
                    <p>
                      {formatAmountWithJpy(amount, priceChange.currency, usdJpyRate)}
                      <span className="ml-2 text-xs text-muted-foreground">
                        (月あたり {monthly.toLocaleString()} {CURRENCY_LABEL[priceChange.currency]}
                        {priceChange.currency !== "JPY" && jpy !== null
                          ? ` / 約${Math.round(jpy).toLocaleString()}円`
                          : ""}
                        )
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBillingDay(priceChange)} ・{" "}
                      {format(new Date(priceChange.effectiveFrom), "yyyy年MM月dd日")}
                      {index === 0 ? "〜(現在)" : "〜"}
                    </p>
                    {priceChange.memo && (
                      <p className="mt-1 text-xs whitespace-pre-wrap text-muted-foreground">
                        {priceChange.memo}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button asChild>
            <Link href={`/subscriptions/${subscription.id}/edit`}>編集する</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
