import { requireUserId } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { UpdateSubscriptionSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const parsed = UpdateSubscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.subscription.findFirst({ where: { id, userId } });
  if (!existing) return Response.json({ error: "Not Found" }, { status: 404 });

  const { startDate, cancelledAt, billingMonth, billingCycle, ...rest } = parsed.data;
  const nextBillingCycle = billingCycle ?? existing.billingCycle;

  const subscription = await db.subscription.update({
    where: { id },
    data: {
      ...rest,
      ...(billingCycle && { billingCycle }),
      ...(billingMonth !== undefined && {
        billingMonth: nextBillingCycle === "YEARLY" ? billingMonth : null,
      }),
      ...(startDate && { startDate: new Date(startDate) }),
      ...(cancelledAt !== undefined && {
        cancelledAt: cancelledAt ? new Date(cancelledAt) : null,
      }),
    },
    include: { paymentMethod: true, contractMethod: true },
  });
  return Response.json(subscription);
}

export async function DELETE(_request: Request, { params }: Params) {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await db.subscription.findFirst({ where: { id, userId } });
  if (!existing) return Response.json({ error: "Not Found" }, { status: 404 });

  await db.subscription.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
