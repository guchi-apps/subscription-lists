import { requireUserId } from "@/lib/auth-user";
import { db } from "@/lib/db";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const labels = await db.label.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
  return Response.json(labels);
}
