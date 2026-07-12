import { requireUserId } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { resolveLabelIds } from "@/lib/label-service";
import { UpdateSubscriptionSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

const SUBSCRIPTION_INCLUDE = {
  paymentMethod: true,
  priceChanges: { orderBy: { effectiveFrom: "asc" as const } },
  labels: true,
};

export async function GET(_request: Request, { params }: Params) {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const subscription = await db.subscription.findFirst({
    where: { id, userId },
    include: SUBSCRIPTION_INCLUDE,
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

  const { startDate, endDate, labels, ...rest } = parsed.data;
  const labelIds = await resolveLabelIds(userId, labels);

  const subscription = await db.subscription.update({
    where: { id },
    data: {
      ...rest,
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      ...(labelIds && { labels: { set: labelIds.map((labelId) => ({ id: labelId })) } }),
    },
    include: SUBSCRIPTION_INCLUDE,
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
