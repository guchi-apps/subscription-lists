import { requireUserId } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { CreateSubscriptionSchema } from "@/lib/validators";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const subscriptions = await db.subscription.findMany({
    where: { userId },
    include: { paymentMethod: true, contractMethod: true },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
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

  const { startDate, cancelledAt, billingMonth, ...rest } = parsed.data;

  const subscription = await db.subscription.create({
    data: {
      userId,
      ...rest,
      billingMonth: rest.billingCycle === "YEARLY" ? billingMonth : null,
      startDate: new Date(startDate),
      cancelledAt: cancelledAt ? new Date(cancelledAt) : null,
    },
    include: { paymentMethod: true, contractMethod: true },
  });
  return Response.json(subscription, { status: 201 });
}
