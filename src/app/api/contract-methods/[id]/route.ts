import { requireUserId } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { UpdateContractMethodSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const parsed = UpdateContractMethodSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.contractMethod.findFirst({ where: { id, userId } });
  if (!existing) return Response.json({ error: "Not Found" }, { status: 404 });

  const contractMethod = await db.contractMethod.update({ where: { id }, data: parsed.data });
  return Response.json(contractMethod);
}

export async function DELETE(_request: Request, { params }: Params) {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await db.contractMethod.findFirst({ where: { id, userId } });
  if (!existing) return Response.json({ error: "Not Found" }, { status: 404 });

  const inUse = await db.subscription.findFirst({ where: { contractMethodId: id } });
  if (inUse) {
    return Response.json(
      { error: "サブスクで使用中の契約方法は削除できません。無効化してください。" },
      { status: 409 }
    );
  }

  await db.contractMethod.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
