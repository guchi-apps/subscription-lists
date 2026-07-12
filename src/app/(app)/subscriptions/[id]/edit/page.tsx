import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getUsdJpyRate } from "@/lib/exchange-rate";
import { SubscriptionForm } from "@/components/SubscriptionForm";
import { PriceHistoryManager } from "@/components/PriceHistoryManager";
import type { LabelDTO, MasterDTO, SubscriptionDTO } from "@/types";

export default async function EditSubscriptionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/auth/signin");

  const { id } = await params;
  const [subscription, paymentMethods, labels, usdJpyRate] = await Promise.all([
    db.subscription.findFirst({
      where: { id, userId },
      include: {
        paymentMethod: true,
        priceChanges: { orderBy: { effectiveFrom: "asc" } },
        labels: true,
      },
    }),
    db.paymentMethod.findMany({ where: { userId, isActive: true }, orderBy: { displayOrder: "asc" } }),
    db.label.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    getUsdJpyRate(),
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
          labels={JSON.parse(JSON.stringify(labels)) as LabelDTO[]}
        />
      </div>
      <PriceHistoryManager
        subscriptionId={subscriptionDto.id}
        priceChanges={subscriptionDto.priceChanges}
        usdJpyRate={usdJpyRate}
      />
    </div>
  );
}
