import { requireUserId } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { BonusPeriodSchema } from "@/lib/validators";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const period = await db.bonusPeriod.findUnique({
    where: { userId },
    include: { entries: { orderBy: { recordedAt: "asc" } } },
  });
  return Response.json(period);
}

export async function PUT(request: Request) {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = BonusPeriodSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { startDate, targetAmount, bonusPoints, pointEarnRate } = parsed.data;
  const data = { startDate: new Date(startDate), targetAmount, bonusPoints, pointEarnRate };

  const period = await db.bonusPeriod.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
  return Response.json(period);
}

export async function DELETE() {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await db.bonusPeriod.findUnique({ where: { userId } });
  if (!existing) return Response.json({ error: "Not Found" }, { status: 404 });

  await db.bonusPeriod.delete({ where: { userId } });
  return new Response(null, { status: 204 });
}
