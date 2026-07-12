import { requireUserId } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { UpdateLabelSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const parsed = UpdateLabelSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.label.findFirst({ where: { id, userId } });
  if (!existing) return Response.json({ error: "Not Found" }, { status: 404 });

  if (parsed.data.name && parsed.data.name !== existing.name) {
    const duplicate = await db.label.findFirst({
      where: { userId, name: parsed.data.name, NOT: { id } },
    });
    if (duplicate) {
      return Response.json({ error: "同じ名前のラベルが既に存在します" }, { status: 409 });
    }
  }

  const label = await db.label.update({ where: { id }, data: parsed.data });
  return Response.json(label);
}

export async function DELETE(_request: Request, { params }: Params) {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await db.label.findFirst({ where: { id, userId } });
  if (!existing) return Response.json({ error: "Not Found" }, { status: 404 });

  await db.label.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
