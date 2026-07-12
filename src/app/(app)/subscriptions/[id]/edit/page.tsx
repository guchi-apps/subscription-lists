import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { SubscriptionForm } from "@/components/SubscriptionForm";
import { PriceHistoryManager } from "@/components/PriceHistoryManager";
import type { MasterDTO, SubscriptionDTO } from "@/types";

export default async function EditSubscriptionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/auth/signin");

  const { id } = await params;
  const [subscription, paymentMethods] = await Promise.all([
    db.subscription.findFirst({
      where: { id, userId },
      include: { paymentMethod: true, priceChanges: { orderBy: { effectiveFrom: "asc" } } },
    }),
    db.paymentMethod.findMany({ where: { userId, isActive: true }, orderBy: { displayOrder: "asc" } }),
  ]);
  if (!subscription) notFound();

  const subscriptionDto = JSON.parse(JSON.stringify(subscription)) as SubscriptionDTO;

  return (
    <div className="max-w-xl space-y-8">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">サブスクを編集</h1>
        <SubscriptionForm
          subscription={subscriptionDto}
          paymentMethods={JSON.parse(JSON.stringify(paymentMethods)) as MasterDTO[]}
        />
      </div>
      <PriceHistoryManager
        subscriptionId={subscriptionDto.id}
        priceChanges={subscriptionDto.priceChanges}
      />
    </div>
  );
}
