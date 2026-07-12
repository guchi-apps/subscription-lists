import { requireUserId } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { resolveLabelIds } from "@/lib/label-service";
import { CreateSubscriptionSchema } from "@/lib/validators";

const SUBSCRIPTION_INCLUDE = {
  paymentMethod: true,
  priceChanges: { orderBy: { effectiveFrom: "asc" as const } },
  labels: true,
};

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const subscriptions = await db.subscription.findMany({
    where: { userId },
    include: SUBSCRIPTION_INCLUDE,
    orderBy: [{ name: "asc" }],
  });
  return Response.json(subscriptions);
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = CreateSubscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { startDate, endDate, price, labels, ...rest } = parsed.data;
  const labelIds = await resolveLabelIds(userId, labels);

  const subscription = await db.subscription.create({
    data: {
      userId,
      ...rest,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      priceChanges: {
        create: {
          amount: price.amount,
          currency: price.currency,
          billingCycle: price.billingCycle,
          billingInterval: price.billingInterval,
          billingDay: price.billingDay,
          billingMonth: price.billingCycle === "YEARLY" ? price.billingMonth : null,
          effectiveFrom: new Date(startDate),
          memo: price.memo,
        },
      },
      ...(labelIds && { labels: { connect: labelIds.map((id) => ({ id })) } }),
    },
    include: SUBSCRIPTION_INCLUDE,
  });
  return Response.json(subscription, { status: 201 });
}
