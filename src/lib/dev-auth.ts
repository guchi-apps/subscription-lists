/**
 * 開発環境で画面確認をしやすくするための認証バイパス。
 *
 * subpc には GUI が無く、SSH 越しの tmux から作業するため、Google の同意画面を経由する
 * OAuth ログインをエージェントが完了できない。`DISABLE_AUTH=true` の間だけログイン済み扱いにし、
 * DB の先頭ユーザーとして画面・APIを確認できるようにする。
 *
 * **本番で有効にならないよう二重に塞ぐ**（`NODE_ENV=production` では常に無効。加えて
 * `DISABLE_AUTH` が未設定なら無効）。バイパスの判定は proxy.ts と getCurrentUser() の両方に
 * 入れる必要がある。片方だけだと proxy は通るのにユーザーが解決できず、画面が空になる。
 */
export function isAuthBypassEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.DISABLE_AUTH === "true";
}
