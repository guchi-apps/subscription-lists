import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

// 枠で囲む代わりに下線だけで入力欄を区切る見た目。
// iOS Safari では角丸+左右パディングのある枠スタイルの type=date 欄が右側にはみ出て描画される不具合があるため、
// date系入力欄はこちらのスタイルを使うこと。
export const LINE_INPUT_CLASS =
  "rounded-none border-x-0 border-t-0 border-b border-input bg-transparent px-0 focus-visible:ring-0 focus-visible:border-b-2 focus-visible:border-ring disabled:bg-transparent dark:bg-transparent dark:disabled:bg-transparent";

export { Input }
