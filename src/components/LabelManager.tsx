"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Check, ChevronDown, Loader2, Pencil, Trash2 } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label as FieldLabel } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { LabelBadge } from "@/components/LabelBadge";
import { cn } from "@/lib/utils";
import {
  getReadableTextColor,
  LABEL_COLOR_PALETTE,
  toLabelColor,
} from "@/lib/labels";
import type { LabelDTO } from "@/types";

const labelFormSchema = z.object({
  name: z.string().min(1, "ラベル名は必須です").max(30),
  color: z.enum(LABEL_COLOR_PALETTE, { message: "色を選択してください" }),
});
type LabelFormValues = z.infer<typeof labelFormSchema>;

export function LabelManager({ initialLabels }: { initialLabels: LabelDTO[] }) {
  const router = useRouter();
  const [labels, setLabels] = useState(initialLabels);
  const [sectionOpen, setSectionOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<LabelDTO | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LabelFormValues>({
    resolver: zodResolver(labelFormSchema),
    defaultValues: { name: "", color: LABEL_COLOR_PALETTE[0] },
  });
  const color = watch("color");

  function openEditDialog(label: LabelDTO) {
    setEditingLabel(label);
    reset({ name: label.name, color: toLabelColor(label.color) });
    setDialogOpen(true);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/labels/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("削除に失敗しました");
        return;
      }
      setLabels((prev) => prev.filter((l) => l.id !== id));
      toast.success("削除しました");
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  async function onSubmit(values: LabelFormValues) {
    if (!editingLabel) return;

    const res = await fetch(`/api/labels/${editingLabel.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(
        typeof body?.error === "string" ? body.error : "更新に失敗しました",
      );
      return;
    }
    const updated: LabelDTO = await res.json();
    setLabels((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    toast.success("更新しました");
    setDialogOpen(false);
    setEditingLabel(null);
    router.refresh();
  }

  return (
    <Card>
      <CardContent>
        <Collapsible
          open={sectionOpen}
          onOpenChange={setSectionOpen}
          className="space-y-4"
        >
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 text-left"
            >
              <h2 className="text-sm font-semibold text-muted-foreground">
                ラベル
              </h2>
              <ChevronDown
                className={cn(
                  "size-4 text-muted-foreground transition-transform",
                  sectionOpen && "rotate-180",
                )}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4">
            {labels.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                まだラベルが登録されていません。サブスクの編集画面でラベルを入力すると、ここに表示されます。
              </p>
            ) : (
              <div className="space-y-2">
                {labels.map((label) => (
                  <Card key={label.id}>
                    <CardContent className="flex items-center gap-3">
                      <div className="flex-1">
                        <LabelBadge label={label} />
                      </div>
                      <button
                        type="button"
                        onClick={() => openEditDialog(label)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="編集"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            type="button"
                            disabled={deletingId === label.id}
                            className="text-muted-foreground hover:text-destructive disabled:pointer-events-none disabled:opacity-30"
                            aria-label="削除"
                          >
                            {deletingId === label.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              ラベルを削除しますか？
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              「{label.name}
                              」を削除すると、付いているすべてのサブスクからも外れます。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>キャンセル</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(label.id)}
                            >
                              削除する
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CollapsibleContent>

          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) setEditingLabel(null);
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>ラベルを編集</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="label-name">名称</FieldLabel>
                  <Input id="label-name" {...register("name")} />
                  {errors.name && (
                    <p className="text-sm text-destructive">
                      {errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>色</FieldLabel>
                  <Controller
                    control={control}
                    name="color"
                    render={({ field }) => (
                      <div
                        className="grid grid-cols-8 gap-2"
                        role="radiogroup"
                        aria-label="色"
                      >
                        {LABEL_COLOR_PALETTE.map((paletteColor) => (
                          <button
                            key={paletteColor}
                            type="button"
                            role="radio"
                            aria-checked={field.value === paletteColor}
                            aria-label={paletteColor}
                            onClick={() => field.onChange(paletteColor)}
                            className={cn(
                              "flex size-8 items-center justify-center rounded-full ring-1 ring-foreground/10",
                              field.value === paletteColor &&
                                "outline-2 outline-offset-2 outline-ring",
                            )}
                            style={{ backgroundColor: paletteColor }}
                          >
                            {field.value === paletteColor && (
                              <Check
                                className="size-4"
                                style={{
                                  color: getReadableTextColor(paletteColor),
                                }}
                              />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  />
                  {errors.color && (
                    <p className="text-sm text-destructive">
                      {errors.color.message}
                    </p>
                  )}
                  <div className="pt-1">
                    <Badge
                      style={{
                        backgroundColor: color,
                        color: getReadableTextColor(color),
                      }}
                      className="border-transparent"
                    >
                      {watch("name") || "プレビュー"}
                    </Badge>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  更新する
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
