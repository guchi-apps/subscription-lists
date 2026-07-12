import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getUsdJpyRate } from "@/lib/exchange-rate";
import { SubscriptionTimeline } from "@/components/SubscriptionTimeline";
import type { SubscriptionDTO } from "@/types";

export default async function TimelinePage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/auth/signin");

  const [subscriptions, usdJpyRate] = await Promise.all([
    db.subscription.findMany({
      where: { userId },
      include: { paymentMethod: true, priceChanges: { orderBy: { effectiveFrom: "asc" } } },
    }),
    getUsdJpyRate(),
  ]);
  const subscriptionDtos = JSON.parse(JSON.stringify(subscriptions)) as SubscriptionDTO[];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">契約期間タイムライン</h1>
      <SubscriptionTimeline subscriptions={subscriptionDtos} usdJpyRate={usdJpyRate} />
    </div>
  );
}
