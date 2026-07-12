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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  CURRENCY_LABEL,
  convertToJpy,
  getContractStatus,
  getCurrentPrice,
  getMonthlyAmount,
  getNextOccurrence,
  type Currency,
} from "@/lib/billing";
import { cn } from "@/lib/utils";
import { ContractStatusBadge } from "@/components/ContractStatusBadge";
import { SubscriptionDetailDialog } from "@/components/SubscriptionDetailDialog";
import type { SubscriptionDTO } from "@/types";

function MonthlyJpyAmount({
  amount,
  currency,
  usdJpyRate,
}: {
  amount: number;
  currency: Currency;
  usdJpyRate: number | null;
}) {
  if (currency === "JPY") {
    return <span className="text-base font-semibold">{amount.toLocaleString()}円</span>;
  }
  const jpy = convertToJpy(amount, currency, usdJpyRate);
  if (jpy === null) {
    return (
      <span className="text-base font-semibold">
        {amount.toLocaleString()} {CURRENCY_LABEL[currency]}
      </span>
    );
  }
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="text-xs text-muted-foreground">
        {amount.toLocaleString()} {CURRENCY_LABEL[currency]} /
      </span>
      <span className="text-base font-semibold">約{Math.round(jpy).toLocaleString()}円</span>
    </span>
  );
}

type SortKey = "nextOccurrence" | "monthlyAmountDesc" | "name";

const SORT_LABEL: Record<SortKey, string> = {
  monthlyAmountDesc: "金額が高い順（月あたりの金額）",
  nextOccurrence: "次回の更新日が近い順",
  name: "名前順",
};

function toRow(sub: SubscriptionDTO, usdJpyRate: number | null) {
  const priceChanges = sub.priceChanges.map((p) => ({
    ...p,
    amount: Number(p.amount),
    effectiveFrom: new Date(p.effectiveFrom),
  }));
  const startDate = new Date(sub.startDate);
  const endDate = sub.endDate ? new Date(sub.endDate) : null;
  const status = getContractStatus(endDate);
  const referenceDate = status === "ENDED" && endDate ? endDate : new Date();
  const currentPrice = getCurrentPrice(priceChanges, referenceDate);
  const nextOccurrence =
    status === "ENDED" ? null : getNextOccurrence({ startDate, endDate, priceChanges });
  const monthlyAmount = getMonthlyAmount(currentPrice);
  const monthlyJpyAmount = convertToJpy(monthlyAmount, currentPrice.currency, usdJpyRate) ?? monthlyAmount;
  return { sub, status, currentPrice, nextOccurrence, monthlyJpyAmount };
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
  const [includeEnded, setIncludeEnded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("monthlyAmountDesc");

  const rows = useMemo(() => {
    return subscriptions
      .map((sub) => toRow(sub, usdJpyRate))
      .filter(({ status }) => includeEnded || status !== "ENDED")
      .sort((a, b) => {
        if ((a.status === "ENDED") !== (b.status === "ENDED")) {
          return a.status === "ENDED" ? 1 : -1;
        }
        if (sortKey === "nextOccurrence") {
          if (!a.nextOccurrence || !b.nextOccurrence) {
            return a.nextOccurrence ? -1 : b.nextOccurrence ? 1 : 0;
          }
          return a.nextOccurrence.date.getTime() - b.nextOccurrence.date.getTime();
        }
        if (sortKey === "monthlyAmountDesc") {
          return b.monthlyJpyAmount - a.monthlyJpyAmount;
        }
        return a.sub.name.localeCompare(b.sub.name, "ja");
      });
  }, [subscriptions, includeEnded, sortKey, usdJpyRate]);

  const selectedRow = rows.find((row) => row.sub.id === selectedId) ?? null;

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
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2">
          <Switch id="include-ended" checked={includeEnded} onCheckedChange={setIncludeEnded} />
          <Label htmlFor="include-ended" className="text-sm font-normal">
            解約済みも表示する
          </Label>
        </div>
        <Button asChild className="order-2 sm:order-3">
          <Link href="/subscriptions/new">
            <Plus className="size-4" />
            新規登録
          </Link>
        </Button>
        <div className="order-3 flex w-full items-center gap-2 sm:order-2 sm:w-auto">
          <Label htmlFor="sort-key" className="text-sm font-normal text-muted-foreground">
            並び替え
          </Label>
          <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
            <SelectTrigger id="sort-key" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {SORT_LABEL[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {includeEnded ? "まだサブスクが登録されていません。" : "現在契約中のサブスクはありません。"}
        </p>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>サブスク名</TableHead>
                  <TableHead className="text-right">月当たり</TableHead>
                  <TableHead className="pl-6">次回の更新日</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ sub, status, currentPrice, nextOccurrence }) => (
                  <TableRow
                    key={sub.id}
                    className={cn("cursor-pointer", status === "ENDED" && "opacity-50")}
                    onClick={() => setSelectedId(sub.id)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {sub.name}
                        <ContractStatusBadge status={status} />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <MonthlyJpyAmount
                        amount={Math.round(getMonthlyAmount(currentPrice))}
                        currency={currentPrice.currency}
                        usdJpyRate={usdJpyRate}
                      />
                    </TableCell>
                    <TableCell className="pl-6">
                      {nextOccurrence ? format(nextOccurrence.date, "yyyy年MM月dd日") : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
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
            {rows.map(({ sub, status, currentPrice, nextOccurrence }) => (
              <Card
                key={sub.id}
                className={cn("cursor-pointer", status === "ENDED" && "opacity-50")}
                onClick={() => setSelectedId(sub.id)}
              >
                <CardContent className="flex items-center justify-between gap-2">
                  <div>
                    <p className="flex items-center gap-2 font-medium">
                      {sub.name}
                      <ContractStatusBadge status={status} />
                    </p>
                    <p className="text-sm text-muted-foreground">
                      月あたり{" "}
                      <MonthlyJpyAmount
                        amount={Math.round(getMonthlyAmount(currentPrice))}
                        currency={currentPrice.currency}
                        usdJpyRate={usdJpyRate}
                      />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      次回の更新日:{" "}
                      {nextOccurrence ? format(nextOccurrence.date, "yyyy年MM月dd日") : "-"}
                    </p>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
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

      <SubscriptionDetailDialog
        subscription={selectedRow?.sub ?? null}
        status={selectedRow?.status ?? "AUTO_RENEWING"}
        nextOccurrence={selectedRow?.nextOccurrence ?? null}
        usdJpyRate={usdJpyRate}
        open={selectedId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      />
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
