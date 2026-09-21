import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { signOutLocal } from "./sign-out.ts";

test("signOutLocal は scope: local を渡す", async () => {
  const calls: unknown[] = [];
  const client = {
    auth: {
      signOut: async (options: { scope: "local" }) => {
        calls.push(options);
        return { error: null };
      },
    },
  };

  await signOutLocal(client);

  assert.deepEqual(calls, [{ scope: "local" }]);
});

// 共通の Supabase プロジェクトを他アプリと共用しているため、引数なしの signOut() を
// 呼ぶと他アプリのセッションまで失効する。ルート側で signOutLocal を使わずに直接呼んだ場合を検知する。
test("auth.signOut は signOutLocal 以外から直接呼ばれていない", () => {
  const srcDir = join(import.meta.dirname, "..", "..");
  const offenders: string[] = [];

  for (const entry of readdirSync(srcDir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !/\.(ts|tsx)$/.test(entry.name)) continue;
    const path = join(entry.parentPath, entry.name);
    if (/\.test\.tsx?$/.test(path) || path.endsWith(join("supabase", "sign-out.ts"))) continue;
    if (/\.signOut\s*\(/.test(readFileSync(path, "utf8"))) offenders.push(path);
  }

  assert.deepEqual(offenders, []);
});
