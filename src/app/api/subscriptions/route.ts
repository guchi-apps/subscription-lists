import { requireUserId } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { CreateSubscriptionSchema } from "@/lib/validators";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const subscriptions = await db.subscription.findMany({
    where: { userId },
    include: { paymentMethod: true, priceChanges: { orderBy: { effectiveFrom: "asc" } } },
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

  const { startDate, endDate, price, ...rest } = parsed.data;

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
    },
    include: { paymentMethod: true, priceChanges: { orderBy: { effectiveFrom: "asc" } } },
  });
  return Response.json(subscription, { status: 201 });
}
