# subscribe-lists

サブスクリプション契約管理アプリ。各サブスクの名称・金額・月当たり金額・支払い日・支払い方法・契約状況・契約開始日を一覧管理し、支払予定日をカレンダーで確認できる個人向けツール。

## 技術スタック

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui (Radix UI)
- Prisma + MariaDB/MySQL
- NextAuth.js v5 (Google OAuth、本人のみアクセス可)
- react-big-calendar (月間カレンダー) / React Hook Form + Zod

## セットアップ

### 前提

- Node.js >= 20.19.0
- MySQL/MariaDB がローカルで起動していること

### 手順

```bash
npm install

# .env.local を作成（DB/Auth/Google の値を編集する）
npm run env:init

# .env.local の DATABASE_URL に基づき DB・ユーザーを作成
npm run db:setup

# マイグレーション適用
npm run db:migrate:dev

# 開発サーバー起動
npm run dev
```

Google OAuth を使う場合は、開発用の Google Cloud クライアントを別途用意し、承認済みリダイレクト URI に `http://localhost:3000/api/auth/callback/google` を登録する。

## 主なスクリプト

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバー起動（WSL の LAN 経由アクセス設定込み） |
| `npm run build` | 本番ビルド（`prisma generate` を含む） |
| `npm run lint` | ESLint |
| `npm run typecheck` | 型チェック（`tsc --noEmit`） |
| `npm run db:setup` | `.env.local` の `DATABASE_URL` から DB・ユーザーを作成 |
| `npm run db:migrate:dev` | 開発用マイグレーション適用 |
| `npm run db:migrate:deploy` | 本番用マイグレーション適用 |
| `npm run db:studio` | Prisma Studio 起動 |

## ディレクトリ構成

```
src/
├── app/            # ルーティング（App Router）、API ルート、認証ページ
├── components/     # UI コンポーネント（ui/ 含む）
├── lib/            # DB クライアント、支払い計算ロジック、バリデーション等
└── types/          # 型定義
prisma/             # スキーマ・マイグレーション
scripts/            # 開発・DBセットアップ用スクリプト
deploy/             # PM2 / Apache VirtualHost 設定
```

## データモデル

- `Subscription`: サブスク本体（名称・支払い方法・契約開始日・契約終了日・メモなど）
- `SubscriptionPrice`: 料金改定履歴（いつから・いくら・どの周期/支払い日か）。1つのサブスクに複数持たせることで、途中の値上げ・値下げも記録として残す
- `PaymentMethod`: 支払い方法のマスタ（設定画面から登録）

「月当たりの金額」は保存せず、現在時点で有効な `SubscriptionPrice` から `src/lib/billing.ts` で都度計算する。
「契約状況」（自動更新中/解約予定/解約済み）も保存せず、`endDate` と現在日時から都度判定する（未入力=自動更新中、未来日=解約予定、過去日=解約済み）。
