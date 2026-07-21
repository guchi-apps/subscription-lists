import { requireUserId } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { CreateBonusSpendEntrySchema } from "@/lib/validators";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const period = await db.bonusPeriod.findUnique({ where: { userId } });
  if (!period) return Response.json({ error: "Not Found" }, { status: 404 });

  const entries = await db.bonusSpendEntry.findMany({
    where: { periodId: period.id },
    orderBy: { recordedAt: "asc" },
  });
  return Response.json(entries);
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const period = await db.bonusPeriod.findUnique({ where: { userId } });
  if (!period) {
    return Response.json({ error: "先に期間設定を行ってください" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = CreateBonusSpendEntrySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { recordedAt, cumulativeAmount, memo } = parsed.data;
  const entry = await db.bonusSpendEntry.upsert({
    where: { periodId_recordedAt: { periodId: period.id, recordedAt: new Date(recordedAt) } },
    create: { periodId: period.id, recordedAt: new Date(recordedAt), cumulativeAmount, memo },
    update: { cumulativeAmount, memo },
  });
  return Response.json(entry, { status: 201 });
}
