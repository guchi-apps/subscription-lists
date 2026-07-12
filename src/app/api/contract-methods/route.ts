import { requireUserId } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { CreateContractMethodSchema } from "@/lib/validators";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const contractMethods = await db.contractMethod.findMany({
    where: { userId },
    orderBy: { displayOrder: "asc" },
  });
  return Response.json(contractMethods);
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = CreateContractMethodSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const maxOrder = await db.contractMethod.aggregate({
    where: { userId },
    _max: { displayOrder: true },
  });

  const contractMethod = await db.contractMethod.create({
    data: {
      userId,
      ...parsed.data,
      displayOrder: parsed.data.displayOrder ?? (maxOrder._max.displayOrder ?? -1) + 1,
    },
  });
  return Response.json(contractMethod, { status: 201 });
}
