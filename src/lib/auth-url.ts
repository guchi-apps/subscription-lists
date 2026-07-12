/**
 * Auth.js uses AUTH_URL as the canonical origin when building OAuth
 * redirect URIs. In development the app is reachable from multiple hosts
 * (localhost, the WSL LAN IP, a phone via sslip.io, the Cloudflare Tunnel
 * domain) — override AUTH_URL on every request to match whichever host the
 * browser actually used, so the Google OAuth redirect_uri stays valid
 * regardless of access path.
 *
 * In production AUTH_URL is fixed via 1Password/deploy and left untouched.
 */
export function applyAuthUrlFromRequest(
  requestUrl: string,
  hostHeader?: string | null,
  forwardedProto?: string | null
): void {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const url = new URL(requestUrl);
  // cloudflared/リバースプロキシ経由では、ローカルサーバーへは平文HTTPで転送される
  // ため url.protocol は常に "http:" になる。外部での実際のスキームは
  // x-forwarded-proto ヘッダーを優先して採用する（例: Cloudflare Tunnel は https）。
  const protocol = forwardedProto ? `${forwardedProto}:` : url.protocol || "http:";

  if (hostHeader && !hostHeader.startsWith("0.0.0.0")) {
    process.env.AUTH_URL = `${protocol}//${hostHeader}`;
    return;
  }

  if (url.hostname === "0.0.0.0") {
    const port = url.port || process.env.PORT || "3000";
    process.env.AUTH_URL = `${protocol}//localhost:${port}`;
    return;
  }

  process.env.AUTH_URL = `${protocol}//${url.host}`;
}
