import { requireUserId } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { UpdateSubscriptionSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const subscription = await db.subscription.findFirst({
    where: { id, userId },
    include: { paymentMethod: true, priceChanges: { orderBy: { effectiveFrom: "asc" } } },
  });
  if (!subscription) return Response.json({ error: "Not Found" }, { status: 404 });

  return Response.json(subscription);
}

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

  const { startDate, endDate, ...rest } = parsed.data;

  const subscription = await db.subscription.update({
    where: { id },
    data: {
      ...rest,
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
    },
    include: { paymentMethod: true, priceChanges: { orderBy: { effectiveFrom: "asc" } } },
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
