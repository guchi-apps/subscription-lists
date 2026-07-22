import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireUserId } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { BonusProgress } from "@/components/BonusProgress";

export default async function BonusProgressPage() {
  const userId = await requireUserId();
  if (!userId) return null;

  const period = await db.bonusPeriod.findUnique({
    where: { userId },
    include: { entries: { orderBy: { recordedAt: "asc" } } },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        href="/card"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        カード管理に戻る
      </Link>
      <h1 className="text-xl font-semibold">三井住友カード ボーナス進捗</h1>
      <BonusProgress initialPeriod={period ? JSON.parse(JSON.stringify(period)) : null} />
    </div>
  );
}
