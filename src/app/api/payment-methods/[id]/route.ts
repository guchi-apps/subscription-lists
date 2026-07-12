import { requireUserId } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { UpdatePaymentMethodSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const parsed = UpdatePaymentMethodSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.paymentMethod.findFirst({ where: { id, userId } });
  if (!existing) return Response.json({ error: "Not Found" }, { status: 404 });

  const paymentMethod = await db.paymentMethod.update({ where: { id }, data: parsed.data });
  return Response.json(paymentMethod);
}

export async function DELETE(_request: Request, { params }: Params) {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await db.paymentMethod.findFirst({ where: { id, userId } });
  if (!existing) return Response.json({ error: "Not Found" }, { status: 404 });

  const inUse = await db.subscription.findFirst({ where: { paymentMethodId: id } });
  if (inUse) {
    return Response.json(
      { error: "サブスクで使用中の支払い方法は削除できません。無効化してください。" },
      { status: 409 }
    );
  }

  await db.paymentMethod.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
