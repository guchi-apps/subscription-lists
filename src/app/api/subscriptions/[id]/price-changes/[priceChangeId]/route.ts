import { requireUserId } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { UpdatePriceChangeSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string; priceChangeId: string }> };

async function findOwnedPriceChange(id: string, priceChangeId: string, userId: string) {
  const subscription = await db.subscription.findFirst({ where: { id, userId } });
  if (!subscription) return null;
  return db.subscriptionPrice.findFirst({ where: { id: priceChangeId, subscriptionId: id } });
}

export async function PUT(request: Request, { params }: Params) {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id, priceChangeId } = await params;
  const existing = await findOwnedPriceChange(id, priceChangeId, userId);
  if (!existing) return Response.json({ error: "Not Found" }, { status: 404 });

  const body = await request.json();
  const parsed = UpdatePriceChangeSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { effectiveFrom, billingMonth, ...rest } = parsed.data;
  const nextBillingCycle = parsed.data.billingCycle ?? existing.billingCycle;

  const priceChange = await db.subscriptionPrice.update({
    where: { id: priceChangeId },
    data: {
      ...rest,
      ...(billingMonth !== undefined && {
        billingMonth: nextBillingCycle === "YEARLY" ? billingMonth : null,
      }),
      ...(effectiveFrom && { effectiveFrom: new Date(effectiveFrom) }),
    },
  });
  return Response.json(priceChange);
}

export async function DELETE(_request: Request, { params }: Params) {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id, priceChangeId } = await params;
  const existing = await findOwnedPriceChange(id, priceChangeId, userId);
  if (!existing) return Response.json({ error: "Not Found" }, { status: 404 });

  const count = await db.subscriptionPrice.count({ where: { subscriptionId: id } });
  if (count <= 1) {
    return Response.json(
      { error: "最後の料金記録は削除できません。" },
      { status: 409 }
    );
  }

  await db.subscriptionPrice.delete({ where: { id: priceChangeId } });
  return new Response(null, { status: 204 });
}
