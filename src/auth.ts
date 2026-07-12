import { headers } from "next/headers";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { authConfig } from "@/auth.config";
import { db } from "@/lib/db";
import { notifySignalyLogin } from "@/lib/signaly";

const nextAuth = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  events: {
    async signIn({ user }) {
      const headersList = await headers();
      const ip =
        headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        headersList.get("x-real-ip");
      await notifySignalyLogin({ email: user.email ?? null, ip });
    },
  },
});

export const { handlers, signIn, signOut } = nextAuth;

// 開発環境で画面確認をしやすくするための一時的な認証バイパス(DISABLE_AUTH=true の間のみ有効)。
// 確認が終わったら auth.ts のこの分岐と proxy.ts の対応する分岐を削除すること。
async function devBypassAuth() {
  const user = await db.user.findFirst();
  if (!user) return null;
  return { user: { id: user.id, email: user.email, name: user.name, image: user.image } };
}

export const auth = process.env.DISABLE_AUTH === "true" ? devBypassAuth : nextAuth.auth;
