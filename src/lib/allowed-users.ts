/**
 * このアプリを使ってよい Google アカウントか判定する。
 *
 * 共通の Supabase プロジェクトを他アプリと共用しているため、「Supabase でログインできる」ことと
 * 「subscription-lists を使ってよい」ことは別に判定する必要がある。判定はフロントエンドではなく
 * サーバー側（/auth/callback）で行う。
 *
 * 許可アドレスは環境変数 ALLOWED_EMAIL に設定する（カンマ区切りで複数可）。
 * **未設定のときは全員拒否する。** 設定漏れがそのまま「誰でも入れる」状態になるのを避けるため。
 */
export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;

  const allowed = allowedEmails();
  if (allowed.length === 0) return false;

  return allowed.includes(email.toLowerCase());
}

/** ALLOWED_EMAIL に設定された許可アドレスを小文字で返す（未設定なら空配列）。 */
export function allowedEmails(): string[] {
  return (process.env.ALLOWED_EMAIL ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}
