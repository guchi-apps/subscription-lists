# subscription-lists

サブスクリプション契約管理アプリ。各サブスクの名称・金額・月当たり金額・支払い日・支払い方法・契約状況・契約開始日を一覧管理し、支払予定日をカレンダーで確認できる個人向けツール。

## 技術スタック

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui (Radix UI)
- Prisma + MariaDB/MySQL
- Supabase Auth (Google OAuth、本人のみアクセス可)
- react-big-calendar (月間カレンダー) / React Hook Form + Zod

## セットアップ

### 前提

- Node.js >= 20.19.0
- MySQL/MariaDB がローカルで起動していること

### 手順

```bash
npm install

# .env.local を作成（DB・Supabase・許可メールアドレスの値を編集する）
npm run env:init

# .env.local の DATABASE_URL に基づき DB・ユーザーを作成
npm run db:setup

# マイグレーション適用
npm run db:migrate:dev

# 開発サーバー起動
npm run dev
```

### 認証（Supabase Auth）

ログインは共通の Supabase プロジェクトの Google プロバイダで行う。**開発用と本番用で Supabase プロジェクトを分ける**（Google Cloud プロジェクトは共通で、OAuth クライアントを dev/prod で分ける）。

| 環境変数 | 内容 | 取得元 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase の project URL | 1Password の Supabase アイテム `project-url`。本番は organization 共通の GitHub variable `SUPABASE_PROJECT_URL` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase の publishable key | 同 `publishable-key`。本番は GitHub variable `SUPABASE_PUBLISHABLE_KEY` |
| `ALLOWED_EMAIL` | ログインを許可する Google アカウント（カンマ区切りで複数可）。**未設定なら誰もログインできない** | 1Password `op://apps/subscribe-lists/allowed-email` |
| `AUTH_URL` | 公開 URL。アプリからは参照しないが、Supabase の Redirect URLs 登録と Apache VirtualHost の生成で使う本番 URL の正 | 1Password `op://apps/subscribe-lists/auth-url` |

ローカル開発では 1Password への依存を避けるため、**開発用** Supabase の値を `.env.local` へ直接書く（`.env.local` は Git 管理対象外）。`service_role` キーはフロントエンドにもリポジトリにも VPS にも置かない。

Supabase ダッシュボードの **Authentication > URL Configuration > Redirect URLs** に、使うアクセス経路ぶんのコールバック URL を登録しておく。

```text
http://localhost:3000/auth/callback              # ローカル
http://<LAN-IP>.sslip.io:3000/auth/callback      # LAN 上のスマホ等
https://subscribe-dev.minagu.work/auth/callback  # Cloudflare Tunnel 経由
https://<本番ドメイン>/auth/callback              # 本番（本番用 Supabase プロジェクト側）
```

本番では不要に広いワイルドカードを登録しない。

**認証の流れ**（`src/lib/supabase/`・`src/app/auth/`）

1. `/login` の「Googleでログイン」は素のリンクで `/auth/signin` を開く。ハイドレーション前でも押せるよう、認可 URL の組み立てはサーバー（Route Handler）で行う
2. Google の同意後、`/auth/callback` が `exchangeCodeForSession` でセッションを確立し、`ALLOWED_EMAIL` で許可判定したうえで Supabase ユーザー ID を `User.supabaseUserId` へ紐付ける（既存ユーザーはメールアドレスで突き合わせる）
3. `src/proxy.ts` が毎リクエストで `supabase.auth.getUser()` を呼び、アクセストークンの署名・有効期限・発行元を Supabase 側で検証する（自前でデコードしない）。検証済みの ID は内部ヘッダーで後段へ渡し、`getCurrentUser()` が同じ検証を繰り返さないようにしている
4. ログアウトは `/auth/signout`（POST）

**画面確認用の認証バイパス**

GUI の無いホスト（SSH 越しの tmux 等）から OAuth ログインは完了できないため、`.env.local` に `DISABLE_AUTH=true` を設定している間だけログイン済み扱いにして、DB の先頭ユーザーとして画面・API を確認できる。`NODE_ENV=production` では常に無効（`src/lib/dev-auth.ts`）。

### 別端末（スマホ等）からの動作確認

`npm run dev` 起動時に、以下のアクセス経路がコンソールに表示される。

- **LAN 内**: `http://<LAN-IP>.sslip.io:3000`（同じ Wi-Fi 上のスマホ等から）
- **外出先**: `https://subscribe-dev.minagu.work`（Cloudflare Tunnel 経由。共有トンネル `dev-tunnel` に相乗り）

いずれも `next.config.ts` の `allowedDevOrigins`（`*.sslip.io` / `*.minagu.work`）でクロスオリジンリクエストを許可している。

**外出先からのアクセス（Cloudflare Tunnel）**

`npm run dev`（`scripts/dev-wsl-lan.sh`）が、共有 Named Tunnel `dev-tunnel` が未起動なら自動で起動する（他アプリの dev サーバーで既に起動済みならそのまま利用、二重起動はしない）。起動ログは `/tmp/cloudflared-dev-tunnel.log`。

自動起動に失敗した場合は手動で起動する:

```bash
cloudflared tunnel run dev-tunnel
```

（Cloudflare 側のトンネル・DNS 設定はこのリポジトリの管理外。`~/.cloudflared/config.yml` にホスト設定済み）

Google ログインを外出先でも確認する場合は、**開発用 Supabase プロジェクト**の Redirect URLs に `https://subscribe-dev.minagu.work/auth/callback` を追加登録する。また、Cloudflare Access で本人の Google アカウントのみアクセスを許可する設定を Zero Trust ダッシュボード側で行うことを推奨する（このリポジトリの管理外）。

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
├── app/            # ルーティング（App Router）、API ルート、認証（auth/・login/）
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

## サーバー間参照用 API

同一VPS上の他アプリ（AIDE）が月額固定費と次の支払予定を取得するための `/api/internal/*` を用意している。認証は共有シークレット（`INTERNAL_API_KEY`）1本。仕様は [docs/internal-api.md](docs/internal-api.md) を参照。
