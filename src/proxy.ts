import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/auth.config";
import { applyAuthUrlFromRequest } from "@/lib/auth-url";

const { auth } = NextAuth(authConfig);

const publicPaths = ["/", "/auth/signin", "/auth/error"];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default auth((req) => {
  applyAuthUrlFromRequest(req.url, req.headers.get("host"), req.headers.get("x-forwarded-proto"));

  // 開発環境で画面確認をしやすくするための一時的な認証バイパス(DISABLE_AUTH=true の間のみ有効)。
  // 確認が終わったらこの分岐と auth.ts の対応する分岐を削除すること。
  if (process.env.DISABLE_AUTH === "true") {
    // バイパス中は常にログイン済み扱いのため、/auth/signin に来た場合も本来の挙動同様に
    // アプリ側へ戻す(素通りさせるとログイン画面がそのまま表示されてしまう)。
    if (req.nextUrl.pathname === "/auth/signin") {
      return NextResponse.redirect(new URL("/subscriptions", req.url));
    }
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  // /api/* はルートハンドラ自身が requireUserId() で認証チェックし、
  // 401 JSON を返す設計のため、proxy ではリダイレクトせず素通りさせる。
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    if (req.auth?.user?.id && pathname === "/auth/signin") {
      return NextResponse.redirect(new URL("/subscriptions", req.url));
    }
    return NextResponse.next();
  }

  if (!req.auth?.user?.id) {
    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|apple-icon).*)",
  ],
};
