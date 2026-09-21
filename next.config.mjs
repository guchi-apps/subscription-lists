// @ts-check
// next.config は .ts ではなく .mjs にする。.ts だと本番の `next start` が設定ファイルを
// トランスパイルするために SWC のネイティブバイナリを読み込み、そのまま常駐してメモリを食う。
// メモリ削減のため TypeScript に戻さないこと。型は JSDoc と `// @ts-check` で付ける。
import withPWAInit from "@ducanh2912/next-pwa";

const devAllowedOrigins = [
  "*.sslip.io",
  // Cloudflare Tunnel (dev-tunnel) 経由の外出先アクセス用
  "*.minagu.work",
  ...(process.env.DEV_ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? []),
];

/** @type {import("next").NextConfig} */
const nextConfig = {
  allowedDevOrigins: devAllowedOrigins,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }],
  },
  // next-pwa が (disable 時も) webpack 設定を付与するため、
  // 開発時の Turbopack との併用エラーを抑止する。本番ビルドは --webpack で実行する。
  turbopack: {},
};

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  workboxOptions: {
    disableDevLogs: true,
  },
});

export default withPWA(nextConfig);
