import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy-session";

export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

// next-pwa が生成するService Worker関連のファイルは、未ログインでも 200 で返す必要がある。
// ここを通すとログアウト時に /login へのリダイレクトがHTMLで返り、MIMEタイプ違いで
// Service Worker の更新が失敗する。
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|apple-icon|sw\\.js|workbox-.*\\.js|swe-worker.*\\.js|fallback-.*\\.js).*)",
  ],
};
