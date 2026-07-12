import { db } from "@/lib/db";
import { pickDefaultLabelColor } from "@/lib/labels";

/**
 * ラベル名の配列から、そのユーザーのラベルレコードのIDを解決する。
 * 存在しない名前は新規作成する(初回入力時にラベル辞書へ自動登録するため)。
 */
export async function resolveLabelIds(
  userId: string,
  names: string[] | undefined
): Promise<string[] | undefined> {
  if (names === undefined) return undefined;

  const uniqueNames = Array.from(new Set(names.map((name) => name.trim()).filter(Boolean)));
  if (uniqueNames.length === 0) return [];

  const ids = await Promise.all(
    uniqueNames.map(async (name) => {
      const label = await db.label.upsert({
        where: { userId_name: { userId, name } },
        update: {},
        create: { userId, name, color: pickDefaultLabelColor(name) },
      });
      return label.id;
    })
  );
  return ids;
}
