import { timingSafeEqual } from "node:crypto";

import { db } from "@/lib/db";

/**
 * サーバー間参照用API(`/api/internal/*`)の認証。
 *
 * 呼び出し元は同一VPS上のAIDE(`127.0.0.1`)のみを想定しており、共有シークレット1本で守る。
 * 通過した場合は null を返す(既存ルートの `if (!userId) return ...` と同じ書き味に合わせる)。
 */
export function requireInternalApiKey(request: Request): Response | null {
  const expected = process.env.INTERNAL_API_KEY;

  // 未設定を「素通り」にはしない。設定漏れが認証なしの公開に化けるのを防ぐ。
  if (!expected) {
    return Response.json({ error: "Internal API is not configured" }, { status: 503 });
  }

  const header = request.headers.get("authorization");
  const presented = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  if (!presented || !isEqualConstantTime(presented, expected)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

/** 文字列を定数時間で比較する(長さが違う場合は timingSafeEqual が例外を投げるため先に弾く) */
function isEqualConstantTime(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * サーバー間参照APIが対象とするユーザーのIDを返す。
 *
 * 利用者は1人だけで、その1人は `ALLOWED_EMAIL`(ログインを許可するメールアドレス)で既に
 * 環境変数として本番へ配布済みのため、APIキーとユーザーの対応表は持たない。
 * 複数ユーザーを扱う必要が出た時点で、初めて対応表を導入する。
 */
export async function resolveInternalUserId(): Promise<string | null> {
  const email = process.env.ALLOWED_EMAIL;
  if (!email) return null;

  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  return user?.id ?? null;
}
