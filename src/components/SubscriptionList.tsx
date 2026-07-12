"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CONTRACT_STATUS_LABEL,
  convertToJpy,
  formatBillingDay,
  getContractStatus,
  getCurrentPrice,
  getMonthlyAmount,
  type ContractStatus,
} from "@/lib/billing";
import { cn } from "@/lib/utils";
import type { SubscriptionDTO } from "@/types";

const CURRENCY_LABEL: Record<"JPY" | "USD", string> = { JPY: "円", USD: "ドル" };

function formatAmountWithJpy(amount: number, currency: "JPY" | "USD", usdJpyRate: number | null) {
  const base = `${amount.toLocaleString()} ${CURRENCY_LABEL[currency]}`;
  if (currency === "JPY") return base;
  const jpy = convertToJpy(amount, currency, usdJpyRate);
  return jpy !== null ? `${base} (約${Math.round(jpy).toLocaleString()}円)` : base;
}

function ContractStatusBadge({ status }: { status: ContractStatus }) {
  if (status === "AUTO_RENEWING") {
    return <Badge variant="secondary">{CONTRACT_STATUS_LABEL[status]}</Badge>;
  }
  if (status === "SCHEDULED_TO_END") {
    return (
      <Badge
        variant="outline"
        className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
      >
        {CONTRACT_STATUS_LABEL[status]}
      </Badge>
    );
  }
  return <Badge variant="outline">{CONTRACT_STATUS_LABEL[status]}</Badge>;
}

function toRow(sub: SubscriptionDTO) {
  const priceChanges = sub.priceChanges.map((p) => ({
    ...p,
    amount: Number(p.amount),
    effectiveFrom: new Date(p.effectiveFrom),
  }));
  const endDate = sub.endDate ? new Date(sub.endDate) : null;
  const status = getContractStatus(endDate);
  const referenceDate = status === "ENDED" && endDate ? endDate : new Date();
  const currentPrice = getCurrentPrice(priceChanges, referenceDate);
  return { sub, status, currentPrice };
}

export function SubscriptionList({
  subscriptions,
  usdJpyRate,
}: {
  subscriptions: SubscriptionDTO[];
  usdJpyRate: number | null;
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const rows = useMemo(() => {
    return subscriptions
      .map(toRow)
      .sort((a, b) => {
        if ((a.status === "ENDED") !== (b.status === "ENDED")) {
          return a.status === "ENDED" ? 1 : -1;
        }
        return a.sub.name.localeCompare(b.sub.name, "ja");
      });
  }, [subscriptions]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/subscriptions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("削除に失敗しました");
        return;
      }
      toast.success("削除しました");
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <Button asChild>
          <Link href="/subscriptions/new">
            <Plus className="size-4" />
            新規登録
          </Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">まだサブスクが登録されていません。</p>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>サブスク名</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                  <TableHead className="text-right">月当たり</TableHead>
                  <TableHead>支払い日</TableHead>
                  <TableHead>支払い方法</TableHead>
                  <TableHead>契約状況</TableHead>
                  <TableHead>契約開始日</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ sub, status, currentPrice }) => (
                  <TableRow key={sub.id} className={status === "ENDED" ? "opacity-50" : undefined}>
                    <TableCell className="font-medium">{sub.name}</TableCell>
                    <TableCell className="text-right">
                      {formatAmountWithJpy(currentPrice.amount, currentPrice.currency, usdJpyRate)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatAmountWithJpy(
                        Math.round(getMonthlyAmount(currentPrice)),
                        currentPrice.currency,
                        usdJpyRate
                      )}
                    </TableCell>
                    <TableCell>{formatBillingDay(currentPrice)}</TableCell>
                    <TableCell>{sub.paymentMethod.name}</TableCell>
                    <TableCell>
                      <ContractStatusBadge status={status} />
                    </TableCell>
                    <TableCell>{format(new Date(sub.startDate), "yyyy年MM月dd日")}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button asChild variant="ghost" size="icon">
                          <Link href={`/subscriptions/${sub.id}/edit`}>
                            <Pencil className="size-4" />
                          </Link>
                        </Button>
                        <DeleteButton
                          onConfirm={() => handleDelete(sub.id)}
                          isDeleting={deletingId === sub.id}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-2 md:hidden">
            {rows.map(({ sub, status, currentPrice }) => (
              <Card key={sub.id} className={cn(status === "ENDED" && "opacity-50")}>
                <CardContent className="flex items-center justify-between gap-2">
                  <div>
                    <p className="flex items-center gap-2 font-medium">
                      {sub.name}
                      <ContractStatusBadge status={status} />
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatAmountWithJpy(currentPrice.amount, currentPrice.currency, usdJpyRate)} (
                      {formatBillingDay(currentPrice)}) / 月あたり{" "}
                      {formatAmountWithJpy(
                        Math.round(getMonthlyAmount(currentPrice)),
                        currentPrice.currency,
                        usdJpyRate
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{sub.paymentMethod.name}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button asChild variant="ghost" size="icon">
                      <Link href={`/subscriptions/${sub.id}/edit`}>
                        <Pencil className="size-4" />
                      </Link>
                    </Button>
                    <DeleteButton
                      onConfirm={() => handleDelete(sub.id)}
                      isDeleting={deletingId === sub.id}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DeleteButton({
  onConfirm,
  isDeleting,
}: {
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isDeleting}>
          {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>サブスクを削除しますか？</AlertDialogTitle>
          <AlertDialogDescription>この操作は取り消せません。</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>キャンセル</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                削除中...
              </>
            ) : (
              "削除する"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
