"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { formatBillingDay, getMonthlyAmount } from "@/lib/billing";
import type { SubscriptionDTO } from "@/types";

export function SubscriptionList({ subscriptions }: { subscriptions: SubscriptionDTO[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

      {subscriptions.length === 0 ? (
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
                  <TableHead>契約方法</TableHead>
                  <TableHead>契約開始日</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub) => (
                  <TableRow key={sub.id} className={!sub.isActive ? "opacity-50" : undefined}>
                    <TableCell>
                      <span className="font-medium">{sub.name}</span>
                      {!sub.isActive && (
                        <Badge variant="outline" className="ml-2">
                          解約済み
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(sub.amount).toLocaleString()} 円
                    </TableCell>
                    <TableCell className="text-right">
                      {Math.round(getMonthlyAmount({ amount: Number(sub.amount), billingCycle: sub.billingCycle })).toLocaleString()} 円
                    </TableCell>
                    <TableCell>
                      {formatBillingDay({
                        billingCycle: sub.billingCycle,
                        billingDay: sub.billingDay,
                        billingMonth: sub.billingMonth,
                      })}
                    </TableCell>
                    <TableCell>{sub.paymentMethod.name}</TableCell>
                    <TableCell>{sub.contractMethod.name}</TableCell>
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
            {subscriptions.map((sub) => (
              <Card key={sub.id} className={!sub.isActive ? "opacity-50" : undefined}>
                <CardContent className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {sub.name}
                      {!sub.isActive && (
                        <Badge variant="outline" className="ml-2">
                          解約済み
                        </Badge>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {Number(sub.amount).toLocaleString()} 円 (
                      {formatBillingDay({
                        billingCycle: sub.billingCycle,
                        billingDay: sub.billingDay,
                        billingMonth: sub.billingMonth,
                      })}
                      ) / 月あたり
                      {" "}
                      {Math.round(getMonthlyAmount({ amount: Number(sub.amount), billingCycle: sub.billingCycle })).toLocaleString()} 円
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sub.paymentMethod.name} / {sub.contractMethod.name}
                    </p>
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
