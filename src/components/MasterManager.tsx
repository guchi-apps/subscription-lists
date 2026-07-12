"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Pencil, Plus } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import type { MasterDTO } from "@/types";

const masterFormSchema = z.object({
  name: z.string().min(1, "名称は必須です").max(50),
});
type MasterFormValues = z.infer<typeof masterFormSchema>;

export function MasterManager({
  title,
  addLabel,
  apiBasePath,
  initialItems,
}: {
  title: string;
  addLabel: string;
  apiBasePath: string;
  initialItems: MasterDTO[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterDTO | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MasterFormValues>({
    resolver: zodResolver(masterFormSchema),
    defaultValues: { name: "" },
  });

  function openCreateDialog() {
    setEditingItem(null);
    reset({ name: "" });
    setDialogOpen(true);
  }

  function openEditDialog(item: MasterDTO) {
    setEditingItem(item);
    reset({ name: item.name });
    setDialogOpen(true);
  }

  async function handleToggleActive(item: MasterDTO) {
    setTogglingId(item.id);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isActive: !i.isActive } : i)));
    try {
      await fetch(`${apiBasePath}/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      router.refresh();
    } finally {
      setTogglingId(null);
    }
  }

  async function onSubmit(values: MasterFormValues) {
    if (editingItem) {
      const res = await fetch(`${apiBasePath}/${editingItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        toast.error("更新に失敗しました");
        return;
      }
      const updated: MasterDTO = await res.json();
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      toast.success("更新しました");
    } else {
      const res = await fetch(apiBasePath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        toast.error("追加に失敗しました");
        return;
      }
      const created: MasterDTO = await res.json();
      setItems((prev) => [...prev, created]);
      toast.success("追加しました");
    }
    reset();
    setEditingItem(null);
    setDialogOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
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
              {addLabel}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? `${title}を編集` : `${title}を追加`}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">名称</Label>
                <Input id="name" {...register("name")} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
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
        <p className="text-sm text-muted-foreground">まだ登録されていません。</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-center gap-3">
                <p className="flex-1 font-medium">{item.name}</p>
                <button
                  type="button"
                  onClick={() => openEditDialog(item)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="編集"
                >
                  <Pencil className="size-4" />
                </button>
                {togglingId === item.id ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                ) : (
                  <Switch checked={item.isActive} onCheckedChange={() => handleToggleActive(item)} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
