import { requireUserId } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { CreatePaymentMethodSchema } from "@/lib/validators";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const paymentMethods = await db.paymentMethod.findMany({
    where: { userId },
    orderBy: { displayOrder: "asc" },
  });
  return Response.json(paymentMethods);
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = CreatePaymentMethodSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const maxOrder = await db.paymentMethod.aggregate({
    where: { userId },
    _max: { displayOrder: true },
  });

  const paymentMethod = await db.paymentMethod.create({
    data: {
      userId,
      ...parsed.data,
      displayOrder: parsed.data.displayOrder ?? (maxOrder._max.displayOrder ?? -1) + 1,
    },
  });
  return Response.json(paymentMethod, { status: 201 });
}
