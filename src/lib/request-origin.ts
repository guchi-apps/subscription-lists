import type { NextRequest } from "next/server";

/**
 * このリクエストを受け取ったオリジンを返す。
 *
 * 開発サーバーは 0.0.0.0 で待ち受けており、localhost・LANのsslip.ioホスト名・
 * Cloudflare Tunnel のドメインなど複数の経路から到達する。`request.url` の origin は
 * ブラウザが実際に使ったホストを反映しないことがあるため、Host ヘッダーから組み立てる。
 * OAuth のリダイレクト先はここで組み立てた値を使う（経路ごとに正しい redirect_to になる）。
 *
 * 本番は Apache のリバースプロキシ配下で、`ProxyPreserveHost On` と
 * `RequestHeader set X-Forwarded-Proto "https"` を設定済み（deploy/apache-vhost.example.conf）。
 */
export function getRequestOrigin(request: NextRequest): string {
  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";

  if (host && !host.startsWith("0.0.0.0")) {
    return `${proto}://${host}`;
  }

  return new URL(request.url).origin;
}

/** ログイン後の戻り先として安全に使えるパスか（オープンリダイレクト対策）。 */
export function safeNextPath(value: string | null, fallback = "/subscriptions"): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return fallback;
}
