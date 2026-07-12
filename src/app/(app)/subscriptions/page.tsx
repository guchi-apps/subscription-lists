import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { SubscriptionList } from "@/components/SubscriptionList";
import type { SubscriptionDTO } from "@/types";

export default async function SubscriptionsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/auth/signin");

  const subscriptions = await db.subscription.findMany({
    where: { userId },
    include: { paymentMethod: true, priceChanges: { orderBy: { effectiveFrom: "asc" } } },
    orderBy: [{ name: "asc" }],
  });
  const subscriptionDtos = JSON.parse(JSON.stringify(subscriptions)) as SubscriptionDTO[];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">サブスク一覧</h1>
      <SubscriptionList subscriptions={subscriptionDtos} />
    </div>
  );
}
