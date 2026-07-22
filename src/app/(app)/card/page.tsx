import Link from "next/link";
import { Gift } from "lucide-react";

import { requireUserId } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { CreditCardManager } from "@/components/CreditCardManager";
import { Button } from "@/components/ui/button";

export default async function CreditCardsPage() {
  const userId = await requireUserId();
  if (!userId) return null;

  const creditCards = await db.creditCard.findMany({
    where: { userId },
    orderBy: { displayOrder: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">カード管理</h1>
      <CreditCardManager initialItems={JSON.parse(JSON.stringify(creditCards))} />
      <Button asChild variant="outline" className="w-full">
        <Link href="/card/progress">
          <Gift className="size-4" />
          三井住友カード ボーナス進捗を見る
        </Link>
      </Button>
    </div>
  );
}
