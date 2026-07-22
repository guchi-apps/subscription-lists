"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input, LINE_INPUT_CLASS } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label as FieldLabel } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BonusPeriodSchema,
  CreateBonusSpendEntrySchema,
  type BonusPeriodInput,
  type CreateBonusSpendEntry,
} from "@/lib/validators";
import { getBonusSummary, getLatestEntry, type BonusStatus } from "@/lib/bonus";
import type { BonusPeriodDTO, BonusSpendEntryDTO } from "@/types";

const STATUS_LABEL: Record<BonusStatus, string> = {
  IN_PROGRESS: "進行中",
  EARNED: "達成",
  MISSED: "未達成",
};

const STATUS_BADGE_VARIANT: Record<BonusStatus, "default" | "outline" | "destructive"> = {
  IN_PROGRESS: "outline",
  EARNED: "default",
  MISSED: "destructive",
};

function todayInputValue(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-base font-semibold">{value}</p>
    </div>
  );
}

function BonusPeriodForm({
  defaultValues,
  submitLabel,
  onSaved,
}: {
  defaultValues: BonusPeriodInput;
  submitLabel: string;
  onSaved: (period: BonusPeriodDTO) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BonusPeriodInput>({
    resolver: zodResolver(BonusPeriodSchema),
    defaultValues,
  });

  async function onSubmit(values: BonusPeriodInput) {
    const res = await fetch("/api/bonus/period", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      toast.error("保存に失敗しました");
      return;
    }
    const saved: BonusPeriodDTO = await res.json();
    toast.success("保存しました");
    onSaved(saved);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <FieldLabel htmlFor="startDate">起算日</FieldLabel>
        <Input id="startDate" type="date" className={LINE_INPUT_CLASS} {...register("startDate")} />
        {errors.startDate && <p className="text-sm text-destructive">{errors.startDate.message}</p>}
      </div>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="targetAmount">目標利用額(円)</FieldLabel>
        <Input
          id="targetAmount"
          type="number"
          step="1"
          {...register("targetAmount", { valueAsNumber: true })}
        />
        {errors.targetAmount && <p className="text-sm text-destructive">{errors.targetAmount.message}</p>}
      </div>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="bonusPoints">達成時ボーナスポイント</FieldLabel>
        <Input
          id="bonusPoints"
          type="number"
          step="1"
          {...register("bonusPoints", { valueAsNumber: true })}
        />
        {errors.bonusPoints && <p className="text-sm text-destructive">{errors.bonusPoints.message}</p>}
      </div>
      <div className="space-y-1.5">
        <FieldLabel htmlFor="pointEarnRate">通常ポイント還元率(例: 0.005 = 0.5%)</FieldLabel>
        <Input
          id="pointEarnRate"
          type="number"
          step="0.0001"
          {...register("pointEarnRate", { valueAsNumber: true })}
        />
        {errors.pointEarnRate && (
          <p className="text-sm text-destructive">{errors.pointEarnRate.message}</p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  );
}

function BonusEntryForm({
  idPrefix,
  defaultValues,
  submitLabel,
  onSubmit,
}: {
  idPrefix: string;
  defaultValues: CreateBonusSpendEntry;
  submitLabel: string;
  onSubmit: (values: CreateBonusSpendEntry) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateBonusSpendEntry>({
    resolver: zodResolver(CreateBonusSpendEntrySchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <FieldLabel htmlFor={`${idPrefix}-recordedAt`}>記録日</FieldLabel>
          <Input
            id={`${idPrefix}-recordedAt`}
            type="date"
            className={LINE_INPUT_CLASS}
            {...register("recordedAt")}
          />
          {errors.recordedAt && <p className="text-sm text-destructive">{errors.recordedAt.message}</p>}
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor={`${idPrefix}-cumulativeAmount`}>累計利用額(円)</FieldLabel>
          <Input
            id={`${idPrefix}-cumulativeAmount`}
            type="number"
            step="1"
            {...register("cumulativeAmount", { valueAsNumber: true })}
          />
          {errors.cumulativeAmount && (
            <p className="text-sm text-destructive">{errors.cumulativeAmount.message}</p>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        <FieldLabel htmlFor={`${idPrefix}-memo`}>メモ(任意)</FieldLabel>
        <Textarea id={`${idPrefix}-memo`} {...register("memo")} />
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  );
}

export function BonusProgress({ initialPeriod }: { initialPeriod: BonusPeriodDTO | null }) {
  const router = useRouter();
  const [period, setPeriod] = useState(initialPeriod);
  const [entries, setEntries] = useState<BonusSpendEntryDTO[]>(initialPeriod?.entries ?? []);
  const [editPeriodOpen, setEditPeriodOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<BonusSpendEntryDTO | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [pendingLowerEntry, setPendingLowerEntry] = useState<CreateBonusSpendEntry | null>(null);

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt)),
    [entries]
  );

  const latestEntry = useMemo(
    () =>
      getLatestEntry(
        sortedEntries.map((e) => ({ ...e, recordedAt: new Date(e.recordedAt), cumulativeAmount: Number(e.cumulativeAmount) }))
      ),
    [sortedEntries]
  );

  const summary = useMemo(() => {
    if (!period) return null;
    return getBonusSummary(
      {
        startDate: new Date(period.startDate),
        targetAmount: Number(period.targetAmount),
        bonusPoints: period.bonusPoints,
        pointEarnRate: Number(period.pointEarnRate),
      },
      latestEntry ? latestEntry.cumulativeAmount : 0
    );
  }, [period, latestEntry]);

  function upsertEntryInState(saved: BonusSpendEntryDTO) {
    setEntries((prev) => {
      const withoutSameDate = prev.filter((e) => e.recordedAt !== saved.recordedAt);
      return [...withoutSameDate, saved];
    });
  }

  async function submitNewEntry(values: CreateBonusSpendEntry) {
    const res = await fetch("/api/bonus/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(typeof body?.error === "string" ? body.error : "記録に失敗しました");
      return;
    }
    const saved: BonusSpendEntryDTO = await res.json();
    upsertEntryInState(saved);
    toast.success("記録しました");
    router.refresh();
  }

  async function handleNewEntrySubmit(values: CreateBonusSpendEntry) {
    if (latestEntry && values.cumulativeAmount < latestEntry.cumulativeAmount) {
      setPendingLowerEntry(values);
      return;
    }
    await submitNewEntry(values);
  }

  async function handleEditEntrySubmit(values: CreateBonusSpendEntry) {
    if (!editingEntry) return;
    const res = await fetch(`/api/bonus/entries/${editingEntry.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      toast.error("更新に失敗しました");
      return;
    }
    const saved: BonusSpendEntryDTO = await res.json();
    setEntries((prev) => prev.map((e) => (e.id === saved.id ? saved : e)));
    toast.success("更新しました");
    setEditingEntry(null);
    router.refresh();
  }

  async function handleDeleteEntry(id: string) {
    setDeletingEntryId(id);
    try {
      const res = await fetch(`/api/bonus/entries/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("削除に失敗しました");
        return;
      }
      setEntries((prev) => prev.filter((e) => e.id !== id));
      toast.success("削除しました");
      router.refresh();
    } finally {
      setDeletingEntryId(null);
    }
  }

  async function handleResetPeriod() {
    const res = await fetch("/api/bonus/period", { method: "DELETE" });
    if (!res.ok) {
      toast.error("リセットに失敗しました");
      return;
    }
    setPeriod(null);
    setEntries([]);
    toast.success("期間をリセットしました");
    router.refresh();
  }

  if (!period || !summary) {
    return (
      <Card>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            三井住友カードの年間ボーナス進捗を記録するには、まず集計期間を設定してください。
          </p>
          <BonusPeriodForm
            defaultValues={{
              startDate: todayInputValue(),
              targetAmount: 1000000,
              bonusPoints: 10000,
              pointEarnRate: 0.005,
            }}
            submitLabel="設定する"
            onSaved={(saved) => {
              setPeriod(saved);
              router.refresh();
            }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">進捗状況</h2>
            <Dialog open={editPeriodOpen} onOpenChange={setEditPeriodOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="期間設定を編集">
                  <Pencil className="size-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>期間設定を編集</DialogTitle>
                </DialogHeader>
                <BonusPeriodForm
                  defaultValues={{
                    startDate: period.startDate.slice(0, 10),
                    targetAmount: Number(period.targetAmount),
                    bonusPoints: period.bonusPoints,
                    pointEarnRate: Number(period.pointEarnRate),
                  }}
                  submitLabel="更新する"
                  onSaved={(saved) => {
                    setPeriod(saved);
                    setEditPeriodOpen(false);
                    router.refresh();
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">現在の利用額</span>
            <span className="text-2xl font-bold">{Math.round(summary.currentAmount).toLocaleString()}円</span>
          </div>
          <Progress value={summary.progressRatio * 100} />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>目標 {Math.round(Number(period.targetAmount)).toLocaleString()}円</span>
            <Badge variant={STATUS_BADGE_VARIANT[summary.status]}>{STATUS_LABEL[summary.status]}</Badge>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">経過日数</span>
            <span className="text-sm font-medium">
              {summary.daysElapsed}日 / {summary.daysElapsed + summary.daysRemaining}日
            </span>
          </div>
          <Progress value={summary.dateProgressRatio * 100} indicatorClassName="bg-amber-500" />

          <div className="grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-3">
            <Stat label="合計ポイント" value={`${summary.totalPoints.toLocaleString()} pt`} />
            <Stat label="通常ポイント" value={`${summary.regularPoints.toLocaleString()} pt`} />
            <Stat
              label="残り金額"
              value={summary.bonusEarned ? "達成済み" : `${Math.round(summary.remainingAmount).toLocaleString()}円`}
            />
            <Stat label="残り日数" value={`${summary.daysRemaining}日`} />
            <Stat
              label="1日あたり必要額"
              value={summary.requiredDailyPace === null ? "—" : `${Math.ceil(summary.requiredDailyPace).toLocaleString()}円`}
            />
            <Stat label="期間終了日" value={format(summary.periodEndDate, "yyyy年MM月dd日")} />
          </div>

          {summary.bonusEarned && (
            <Badge className="w-fit">ボーナス達成 +{period.bonusPoints.toLocaleString()}pt</Badge>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground">利用額を記録する</h2>
          <BonusEntryForm
            idPrefix="new-entry"
            defaultValues={{ recordedAt: todayInputValue(), cumulativeAmount: 0, memo: "" }}
            submitLabel="記録する"
            onSubmit={handleNewEntrySubmit}
          />

          <AlertDialog
            open={pendingLowerEntry !== null}
            onOpenChange={(open) => {
              if (!open) setPendingLowerEntry(null);
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>前回より少ない金額です</AlertDialogTitle>
                <AlertDialogDescription>
                  前回記録した金額より少ない値です。還付などで正しい場合はそのまま続行してください。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    if (pendingLowerEntry) await submitNewEntry(pendingLowerEntry);
                    setPendingLowerEntry(null);
                  }}
                >
                  続行する
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground">記録履歴</h2>
          {sortedEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">まだ記録がありません。</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日付</TableHead>
                  <TableHead className="text-right">累計額</TableHead>
                  <TableHead className="text-right">前回差分</TableHead>
                  <TableHead>メモ</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEntries.map((entry, i) => {
                  const prev = sortedEntries[i - 1];
                  const delta = prev ? Number(entry.cumulativeAmount) - Number(prev.cumulativeAmount) : null;
                  return (
                    <TableRow key={entry.id}>
                      <TableCell>{format(new Date(entry.recordedAt), "yyyy年MM月dd日")}</TableCell>
                      <TableCell className="text-right">
                        {Math.round(Number(entry.cumulativeAmount)).toLocaleString()}円
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {delta === null ? "-" : `${delta >= 0 ? "+" : ""}${Math.round(delta).toLocaleString()}円`}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{entry.memo || "-"}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="編集"
                            onClick={() => setEditingEntry(entry)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={deletingEntryId === entry.id}
                                aria-label="削除"
                              >
                                {deletingEntryId === entry.id ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Trash2 className="size-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>この記録を削除しますか？</AlertDialogTitle>
                                <AlertDialogDescription>この操作は取り消せません。</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteEntry(entry.id)}>
                                  削除する
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={editingEntry !== null}
        onOpenChange={(open) => {
          if (!open) setEditingEntry(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>記録を編集</DialogTitle>
          </DialogHeader>
          {editingEntry && (
            <BonusEntryForm
              idPrefix="edit-entry"
              defaultValues={{
                recordedAt: editingEntry.recordedAt.slice(0, 10),
                cumulativeAmount: Number(editingEntry.cumulativeAmount),
                memo: editingEntry.memo ?? "",
              }}
              submitLabel="更新する"
              onSubmit={handleEditEntrySubmit}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="w-full text-destructive">
            期間をリセットする
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>期間設定と記録をすべて削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              現在の期間設定と、これまでの記録履歴がすべて削除されます。この操作は取り消せません。新しいサイクルを始めたいときに使用してください。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPeriod}>リセットする</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
