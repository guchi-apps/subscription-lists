import { redirect } from "next/navigation";

import { requireUserId } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { getUsdJpyRate } from "@/lib/exchange-rate";
import { SubscriptionCalendar } from "@/components/SubscriptionCalendar";
import type { SubscriptionDTO } from "@/types";

export default async function CalendarPage() {
  const userId = await requireUserId();
  if (!userId) redirect("/login");

  const [subscriptions, usdJpyRate] = await Promise.all([
    db.subscription.findMany({
      where: { userId },
      include: {
        paymentMethod: true,
        priceChanges: { orderBy: { effectiveFrom: "asc" } },
        labels: true,
      },
    }),
    getUsdJpyRate(),
  ]);
  const subscriptionDtos = JSON.parse(JSON.stringify(subscriptions)) as SubscriptionDTO[];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">支払予定カレンダー</h1>
      <SubscriptionCalendar subscriptions={subscriptionDtos} usdJpyRate={usdJpyRate} />
    </div>
  );
}
