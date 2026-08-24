import { headers } from "next/headers";

import { SUPABASE_USER_ID_HEADER } from "@/lib/auth-header";
import { db } from "@/lib/db";
import { isAuthBypassEnabled } from "@/lib/dev-auth";

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
};

/**
 * ログイン中のユーザーを返す。未ログインなら null。
 *
 * Supabase のセッション検証は proxy.ts が済ませ、結果をヘッダーで渡してくる。ここで
 * auth.getUser() を呼び直すと、1リクエストにつき Supabase への往復が2回入ってしまう。
 * proxy.ts の matcher が外れているパス（静的アセット等）からは呼べないことに注意する。
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const select = { id: true, email: true, name: true, image: true } as const;

  // 開発用の認証バイパス（DISABLE_AUTH=true のときのみ。本番では無効）。
  // proxy.ts 側だけを通しても、ここでユーザーが解決できなければ画面が空になる。
  if (isAuthBypassEnabled()) {
    return db.user.findFirst({ select, orderBy: { createdAt: "asc" } });
  }

  const supabaseUserId = (await headers()).get(SUPABASE_USER_ID_HEADER);
  if (!supabaseUserId) return null;

  return db.user.findUnique({ where: { supabaseUserId }, select });
}

/** ログイン中のユーザーIDを返す。未ログイン、または紐付くユーザーが無ければ null。 */
export async function requireUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}
