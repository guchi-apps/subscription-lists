"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { z } from "zod";

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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CardBrand, CardUsageStatus, CreditCardDTO } from "@/types";

const BRAND_LABEL: Record<CardBrand, string> = {
  VISA: "Visa",
  MASTERCARD: "Mastercard",
  JCB: "JCB",
  AMEX: "American Express",
  DINERS: "Diners Club",
  OTHER: "その他",
};
const BRAND_OPTIONS = Object.entries(BRAND_LABEL) as [CardBrand, string][];

const USAGE_STATUS_LABEL: Record<CardUsageStatus, string> = {
  MAIN: "メイン",
  SUB: "サブ",
  HOLDING_ONLY: "保有のみ",
  CONSIDERING_CANCELLATION: "解約検討中",
  CANCELLED: "解約済み",
};
const USAGE_STATUS_OPTIONS = Object.entries(USAGE_STATUS_LABEL) as [CardUsageStatus, string][];

const creditCardFormSchema = z.object({
  name: z.string().min(1, "カード名は必須です").max(50),
  brand: z.enum(["VISA", "MASTERCARD", "JCB", "AMEX", "DINERS", "OTHER"], {
    message: "ブランドを選択してください",
  }),
  usageStatus: z.enum([
    "MAIN",
    "SUB",
    "HOLDING_ONLY",
    "CONSIDERING_CANCELLATION",
    "CANCELLED",
  ]),
  pointRate: z.string().max(50).optional(),
  billingDay: z
    .number()
    .int()
    .min(1, "1〜31で入力してください")
    .max(31, "1〜31で入力してください")
    .optional(),
  billingAccount: z.string().max(100).optional(),
  annualFee: z.number().nonnegative("0以上の数値を入力してください").optional(),
  creditLimit: z.number().nonnegative("0以上の数値を入力してください").optional(),
  benefits: z.string().optional(),
  memo: z.string().optional(),
});
type CreditCardFormValues = z.infer<typeof creditCardFormSchema>;

function toOptionalNumber(value: string) {
  return value === "" ? undefined : Number(value);
}

const emptyFormValues: CreditCardFormValues = {
  name: "",
  brand: "VISA",
  usageStatus: "MAIN",
  pointRate: "",
  billingDay: undefined,
  billingAccount: "",
  annualFee: undefined,
  creditLimit: undefined,
  benefits: "",
  memo: "",
};

export function CreditCardManager({ initialItems }: { initialItems: CreditCardDTO[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CreditCardDTO | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreditCardFormValues>({
    resolver: zodResolver(creditCardFormSchema),
    defaultValues: emptyFormValues,
  });

  function openCreateDialog() {
    setEditingItem(null);
    reset(emptyFormValues);
    setDialogOpen(true);
  }

  function openEditDialog(item: CreditCardDTO) {
    setEditingItem(item);
    reset({
      name: item.name,
      brand: item.brand,
      usageStatus: item.usageStatus,
      pointRate: item.pointRate ?? "",
      billingDay: item.billingDay ?? undefined,
      billingAccount: item.billingAccount ?? "",
      annualFee: item.annualFee !== null ? Number(item.annualFee) : undefined,
      creditLimit: item.creditLimit !== null ? Number(item.creditLimit) : undefined,
      benefits: item.benefits ?? "",
      memo: item.memo ?? "",
    });
    setDialogOpen(true);
  }

  async function handleMove(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const current = items[index];
    const target = items[targetIndex];

    setMovingId(current.id);
    const reordered = [...items];
    reordered[index] = { ...target, displayOrder: current.displayOrder };
    reordered[targetIndex] = { ...current, displayOrder: target.displayOrder };
    setItems(reordered);

    try {
      const [res1, res2] = await Promise.all([
        fetch(`/api/credit-cards/${current.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayOrder: target.displayOrder }),
        }),
        fetch(`/api/credit-cards/${target.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayOrder: current.displayOrder }),
        }),
      ]);
      if (!res1.ok || !res2.ok) {
        toast.error("並び替えに失敗しました");
      }
      router.refresh();
    } finally {
      setMovingId(null);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/credit-cards/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("削除に失敗しました");
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("削除しました");
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  async function onSubmit(values: CreditCardFormValues) {
    if (editingItem) {
      const res = await fetch(`/api/credit-cards/${editingItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        toast.error("更新に失敗しました");
        return;
      }
      const updated: CreditCardDTO = await res.json();
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      toast.success("更新しました");
    } else {
      const res = await fetch("/api/credit-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        toast.error("追加に失敗しました");
        return;
      }
      const created: CreditCardDTO = await res.json();
      setItems((prev) => [...prev, created]);
      toast.success("追加しました");
    }
    reset(emptyFormValues);
    setEditingItem(null);
    setDialogOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditingItem(null);
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="size-4" />
              カードを追加
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? "カードを編集" : "カードを追加"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="cc-name">名前</Label>
                <Input id="cc-name" {...register("name")} />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>ブランド</Label>
                <Controller
                  control={control}
                  name="brand"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BRAND_OPTIONS.map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label>利用状況</Label>
                <Controller
                  control={control}
                  name="usageStatus"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {USAGE_STATUS_OPTIONS.map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cc-pointRate">ポイント還元</Label>
                  <Input id="cc-pointRate" placeholder="例: 1.0%" {...register("pointRate")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cc-billingDay">引き落とし日</Label>
                  <Input
                    id="cc-billingDay"
                    type="number"
                    min={1}
                    max={31}
                    {...register("billingDay", { setValueAs: toOptionalNumber })}
                  />
                  {errors.billingDay && (
                    <p className="text-sm text-destructive">{errors.billingDay.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cc-billingAccount">引き落とし口座</Label>
                <Input id="cc-billingAccount" {...register("billingAccount")} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cc-annualFee">年会費</Label>
                  <Input
                    id="cc-annualFee"
                    type="number"
                    min={0}
                    {...register("annualFee", { setValueAs: toOptionalNumber })}
                  />
                  {errors.annualFee && (
                    <p className="text-sm text-destructive">{errors.annualFee.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cc-creditLimit">利用可能額</Label>
                  <Input
                    id="cc-creditLimit"
                    type="number"
                    min={0}
                    {...register("creditLimit", { setValueAs: toOptionalNumber })}
                  />
                  {errors.creditLimit && (
                    <p className="text-sm text-destructive">{errors.creditLimit.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cc-benefits">特典</Label>
                <Textarea id="cc-benefits" {...register("benefits")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cc-memo">備考</Label>
                <Textarea id="cc-memo" {...register("memo")} />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {editingItem ? "更新する" : "追加する"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">まだカードが登録されていません。</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <Card key={item.id}>
              <CardContent
                className="flex cursor-pointer items-center gap-3"
                onClick={() => toggleExpand(item.id)}
                role="button"
                aria-expanded={expandedIds.has(item.id)}
              >
                <div className="flex flex-col" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => handleMove(index, "up")}
                    disabled={index === 0 || movingId !== null}
                    className="text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                    aria-label="上に移動"
                  >
                    <ChevronUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(index, "down")}
                    disabled={index === items.length - 1 || movingId !== null}
                    className="text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                    aria-label="下に移動"
                  >
                    <ChevronDown className="size-4" />
                  </button>
                </div>
                <div className="flex-1 space-y-1">
                  <p className="font-medium">{item.name}</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary">{BRAND_LABEL[item.brand]}</Badge>
                    <Badge variant="outline">{USAGE_STATUS_LABEL[item.usageStatus]}</Badge>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditDialog(item);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="編集"
                >
                  <Pencil className="size-4" />
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                      disabled={deletingId === item.id}
                      className="text-muted-foreground hover:text-destructive disabled:pointer-events-none disabled:opacity-30"
                      aria-label="削除"
                    >
                      {deletingId === item.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>カードを削除しますか？</AlertDialogTitle>
                      <AlertDialogDescription>
                        「{item.name}」を削除します。この操作は取り消せません。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>キャンセル</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(item.id)}>
                        削除する
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition-transform",
                    expandedIds.has(item.id) && "rotate-180",
                  )}
                />
              </CardContent>
              {expandedIds.has(item.id) && (
                <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">ポイント還元</p>
                    <p>{item.pointRate || "未設定"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">引き落とし日</p>
                    <p>{item.billingDay ? `${item.billingDay}日` : "未設定"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">引き落とし口座</p>
                    <p>{item.billingAccount || "未設定"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">年会費</p>
                    <p>{item.annualFee !== null ? `${Number(item.annualFee).toLocaleString()}円` : "未設定"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">利用可能額</p>
                    <p>
                      {item.creditLimit !== null
                        ? `${Number(item.creditLimit).toLocaleString()}円`
                        : "未設定"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">特典</p>
                    <p className="whitespace-pre-wrap">{item.benefits || "未設定"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">備考</p>
                    <p className="whitespace-pre-wrap">{item.memo || "未設定"}</p>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
