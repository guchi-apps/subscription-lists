import { requireUserId } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { CreatePriceChangeSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const subscription = await db.subscription.findFirst({ where: { id, userId } });
  if (!subscription) return Response.json({ error: "Not Found" }, { status: 404 });

  const body = await request.json();
  const parsed = CreatePriceChangeSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const effectiveFrom = new Date(parsed.data.effectiveFrom);
  if (effectiveFrom < subscription.startDate) {
    return Response.json(
      { error: "適用開始日は契約開始日以降にしてください。" },
      { status: 400 }
    );
  }

  const existing = await db.subscriptionPrice.findFirst({
    where: { subscriptionId: id, effectiveFrom },
  });
  if (existing) {
    return Response.json(
      { error: "同じ適用開始日の料金改定が既に存在します。" },
      { status: 409 }
    );
  }

  const priceChange = await db.subscriptionPrice.create({
    data: {
      subscriptionId: id,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      billingCycle: parsed.data.billingCycle,
      billingDay: parsed.data.billingDay,
      billingMonth: parsed.data.billingCycle === "YEARLY" ? parsed.data.billingMonth : null,
      effectiveFrom,
    },
  });
  return Response.json(priceChange, { status: 201 });
}
