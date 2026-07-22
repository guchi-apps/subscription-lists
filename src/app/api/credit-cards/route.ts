import { requireUserId } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { CreateCreditCardSchema } from "@/lib/validators";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const creditCards = await db.creditCard.findMany({
    where: { userId },
    orderBy: { displayOrder: "asc" },
  });
  return Response.json(creditCards);
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = CreateCreditCardSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const maxOrder = await db.creditCard.aggregate({
    where: { userId },
    _max: { displayOrder: true },
  });

  const creditCard = await db.creditCard.create({
    data: {
      userId,
      ...parsed.data,
      displayOrder: parsed.data.displayOrder ?? (maxOrder._max.displayOrder ?? -1) + 1,
    },
  });
  return Response.json(creditCard, { status: 201 });
}
