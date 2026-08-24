import Link from "next/link";
import { OctagonAlert, Wallet } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { safeNextPath } from "@/lib/request-origin";

const errorMessages: Record<string, string> = {
  not_allowed: "許可されていないアカウントです。別のGoogleアカウントでお試しください。",
  auth_failed: "ログインに失敗しました。時間をおいて、もう一度お試しください。",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;
  const next = safeNextPath(callbackUrl ?? null);
  const errorMessage = error ? (errorMessages[error] ?? errorMessages.auth_failed) : null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <Card className="w-full max-w-sm text-center">
        <CardHeader className="items-center">
          <span className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Wallet className="size-6" />
          </span>
          <CardTitle className="text-xl">ログイン</CardTitle>
          <CardDescription>Googleアカウントでログインしてください。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage && (
            <p className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-left text-sm text-destructive">
              <OctagonAlert className="mt-0.5 size-4 shrink-0" />
              {errorMessage}
            </p>
          )}

          {/*
            ログインは素のリンクにしておく。onClick でログインを開始すると、クライアントJSの
            ハイドレーションが完了するまでボタンを押しても何も起きない状態が生まれる。
          */}
          <Link
            href={`/auth/signin?next=${encodeURIComponent(next)}`}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Googleでログイン
          </Link>

          <p className="text-xs text-muted-foreground">
            許可されたGoogleアカウントのみログインできます。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
