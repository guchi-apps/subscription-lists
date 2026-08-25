import { NextResponse, type NextRequest } from "next/server";

import { getRequestOrigin } from "@/lib/request-origin";
import { createClient } from "@/lib/supabase/server";

/**
 * ログアウトする。
 *
 * ログイン（/auth/signin）と同じくハイドレーション前でも押せる必要があるため、
 * フォームの POST で受ける。GET にしないのは、ブラウザやリンクの先読みで意図せず
 * ログアウトさせられることを避けるため。
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("[subscription-lists] ログアウトに失敗:", error.message);
  }

  // POST のリダイレクトは 303 で返す。既定の 307 のままだとリダイレクト先へも POST される。
  return NextResponse.redirect(new URL("/", getRequestOrigin(request)), 303);
}
