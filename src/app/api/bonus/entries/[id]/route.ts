import { requireUserId } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { UpdateBonusSpendEntrySchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const parsed = UpdateBonusSpendEntrySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.bonusSpendEntry.findFirst({ where: { id, period: { userId } } });
  if (!existing) return Response.json({ error: "Not Found" }, { status: 404 });

  const { recordedAt, cumulativeAmount, memo } = parsed.data;
  const entry = await db.bonusSpendEntry.update({
    where: { id },
    data: {
      ...(recordedAt !== undefined && { recordedAt: new Date(recordedAt) }),
      ...(cumulativeAmount !== undefined && { cumulativeAmount }),
      ...(memo !== undefined && { memo }),
    },
  });
  return Response.json(entry);
}

export async function DELETE(_request: Request, { params }: Params) {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await db.bonusSpendEntry.findFirst({ where: { id, period: { userId } } });
  if (!existing) return Response.json({ error: "Not Found" }, { status: 404 });

  await db.bonusSpendEntry.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
