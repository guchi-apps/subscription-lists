import type { AuthError } from "@supabase/supabase-js";

type SignOutClient = {
  auth: {
    signOut(options: { scope: "local" }): Promise<{ error: AuthError | null }>;
  };
};

/**
 * このアプリのセッションだけを破棄する。
 *
 * 共通の Supabase プロジェクトを他アプリと共用しているため、引数なしの signOut() は使わない。
 * 既定の scope は "global" で、同じユーザーの他アプリ・他端末の refresh token まで失効してしまう。
 * 通常ログアウトも、許可外ユーザーの拒否のように「このアプリでは使わせない」だけの経路も、
 * この関数を通して scope: "local" にそろえる。
 *
 * 全セッションを終了させたいのはアカウント自体を削除するときだけで、その操作は今のところ無い。
 * 追加する場合は、この関数を使わず scope: "global" を明示して呼ぶこと。
 */
export function signOutLocal(supabase: SignOutClient) {
  return supabase.auth.signOut({ scope: "local" });
}
