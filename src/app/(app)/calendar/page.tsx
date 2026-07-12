import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { SubscriptionCalendar } from "@/components/SubscriptionCalendar";
import type { SubscriptionDTO } from "@/types";

export default async function CalendarPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/auth/signin");

  const subscriptions = await db.subscription.findMany({
    where: { userId },
    include: { paymentMethod: true, priceChanges: { orderBy: { effectiveFrom: "asc" } } },
  });
  const subscriptionDtos = JSON.parse(JSON.stringify(subscriptions)) as SubscriptionDTO[];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">支払予定カレンダー</h1>
      <SubscriptionCalendar subscriptions={subscriptionDtos} />
    </div>
  );
}
