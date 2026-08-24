import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * ログアウトボタン。`<form action="/auth/signout" method="post">` の中に置いて使う。
 * サーバーアクションではなく素のフォーム送信なので、クライアントJSのハイドレーション前でも押せる。
 */
export function SignOutButton() {
  return (
    <Button type="submit" variant="ghost" size="sm">
      <LogOut className="size-4" />
      ログアウト
    </Button>
  );
}
