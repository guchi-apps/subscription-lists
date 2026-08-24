import Link from "next/link";
import { ArrowRight, CalendarDays, Wallet } from "lucide-react";

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-24 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_60%)]"
      />

      <span className="mb-6 inline-flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
        <Wallet className="size-7" />
      </span>

      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">subscription-lists</h1>
      <p className="mt-4 max-w-md text-balance text-muted-foreground">
        サブスクの契約状況をまとめて管理。Googleアカウントでログインして始めましょう。
      </p>

      {/*
        ログインは素のリンクにしておく。onClick でログインを開始すると、クライアントJSの
        ハイドレーションが完了するまでボタンを押しても何も起きない状態が生まれる。
      */}
      <Link
        href="/auth/signin"
        className="mt-8 flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <ArrowRight className="size-4" />
        Googleでログイン
      </Link>

      <div className="mt-16 flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarDays className="size-4" />
        支払予定日をカレンダーでひと目で確認
      </div>
    </div>
  );
}
