# subscription-lists 固有ルール

このリポジトリで作業する Claude Code エージェント向けのルールを記載する。

**GitHub Actions 上での実行は、このリポジトリをチェックアウトしたワークツリーしか参照できない。**
したがって無人実行でも守られる必要があるルールは、このファイルに明文化しておく必要がある。

## マルチエージェント運用（GitHub Actions 無人実行）

`@claude` コメントを起点に、計画提示〜実装〜develop向けPR作成までを GitHub Actions 上で無人実行する。
ワークフローの実体は `guchi-apps/issue-deck` にあり、このリポジトリの `.github/workflows/` には
`uses:` で参照する薄い caller だけを置いている（`@workflows/v9`）。

| ファイル | 役割 |
|---|---|
| `claude-issue-dispatch.yml` | `@claude` 起点の無人実行（計画提示・実装・PR作成・質問応答） |
| `issue-labels.yml` | Issueの進捗（Project Status）の状態遷移 |

設計・運用の詳細は issue-deck 側を参照する。

- 進捗管理の設計: [progress-status-architecture.md](https://github.com/guchi-apps/issue-deck/blob/main/docs/progress-status-architecture.md)
- 無人実行の挙動: [multi-agent/dispatch.md](https://github.com/guchi-apps/issue-deck/blob/main/docs/multi-agent/dispatch.md)

**素の Claude Code ワークフロー（`claude.yml`・`claude-code-review.yml`）は削除した。**
`/install-github-app` が生成したもので、`claude.yml` は `claude-issue-dispatch.yml` と
同じ `issue_comment` イベントで起動するため、1つのコメントで Claude が二重に走っていた。
再導入しないこと。

## ブランチ運用

- `main` は本番と一致するリリース用ブランチ。直接pushは禁止し、`develop` → `main` のPRのみで進める
- `develop` が日常の開発ブランチ。**デフォルトブランチは `develop`**（`issues`・`issue_comment`
  イベントはデフォルトブランチのワークフローしか起動しないため、変更すると無人実行が動かなくなる）
- Issue専用ブランチは `develop` から作成し、ブランチ名は **`issue-<Issue番号>`** とする（例: `issue-45`）。
  ワークフローはブランチ名から対象Issueを特定するため、**この命名規約に従わないブランチはすべて対象外**になる

## Issueの進捗

**進捗は GitHub Projects の Status で管理する。進捗ラベルは存在しない**
（issue-deck#1010 / #991 Phase 5 で `01.wip`〜`09.main` を廃止した）。

1. `Ready` — 未着手
2. `Planning` — 計画検討中（`21.plan-required` 選択時のみ経由）
3. `Implementation` — 実装中
4. `Develop PR` — developへPR作成・マージ中
5. `Develop` — developへマージ完了（main未反映）
6. `Release` — mainへPR作成・マージ中
7. `Done` — mainへマージ完了。この時点でissueをcloseする

**`gh issue edit` で進捗を進めることはできない。** Status を書けるのは issue-deck だけで、
ワークフローは進捗報告API（`POST /api/progress`）へ報告する。ブランチのpush・PR作成・PRマージを
トリガーに自動で遷移するため、エージェントが自分で進捗を動かす必要はない。

## 条件を表すラベル（進捗とは別軸）

Status = 今どこにいるか、Label = どんな性質・条件があるか、という役割分担にしている。

| ラベル | 意味 |
|---|---|
| `00.check-user` | ユーザーの確認・指示が必要。どの段階でも併用する |
| `00.qa-answered` | 質問への回答のみ完了（`00.check-user` と常に併用） |
| `11.local` | ローカル（VSCode等）で対応中。付いている間は無人実行を起動しない |
| `21.plan-required` | 実装前に計画を提示し承認を得る |
| `22.merge-confirm-required` | 内容によらず、developへのマージ前に必ず `00.check-user` を付ける |
| `23.preview-required` | PR作成前に開発サーバーでの画面確認を必須にする |
| `24.screenshot-required` | PR作成前にスクリーンショット取得を必須にする |

## 扱わない情報

**クレジットカードの券面情報（ブランド・還元率・引き落とし日/口座・年会費・利用可能額・特典）は
このアプリでは管理しない。** Notionの「管理台帳」データベースへ移管済みで、v0.5.0で入れた
カード管理台帳（`/card`の一覧・`/api/credit-cards`・`CreditCard`テーブル）はissue #42で削除した。
二重管理を避けるため再実装しないこと。`/card`は三井住友カードのボーナス進捗（利用額の記録）専用で、
これはカードの券面情報ではないため対象外。

設定画面の「支払い方法」（`PaymentMethod`）はサブスクの支払い元を選ぶための名称だけを持つもので、
券面情報ではない。こちらは引き続きこのアプリで管理する。

## 認証

ログインは**Supabase Auth（Google）**。共通のSupabaseプロジェクトを他アプリと共用しており、
開発用と本番用でプロジェクトを分けている。NextAuth.js（Auth.js v5）からは issue #38 で移行した。

- **`service_role`キーをフロントエンド・リポジトリ・VPSへ置かない。** 使うのは publishable key だけ
- **JWTを自前でデコードしない。** `src/proxy.ts` が `supabase.auth.getUser()` を呼び、署名・有効期限・
  発行元の検証をSupabase側にさせる。検証済みのユーザーIDは内部ヘッダー（`src/lib/auth-header.ts`）で
  後段へ渡し、`getCurrentUser()` が同じ往復を繰り返さないようにしている
- **「Supabaseでログインできる」と「このアプリを使ってよい」は別に判定する。** 許可判定は
  `ALLOWED_EMAIL`（カンマ区切り）で `/auth/callback` が行う。**未設定なら全員拒否**
- **`User.id` は差し替えない。** サブスク等の外部キーに使われているため、Supabaseのユーザーは
  `User.supabaseUserId` で紐付ける（移行前のユーザーは初回ログイン時にメールアドレスで突き合わせる）
- ログイン・ログアウトの導線は素のリンク/フォームにする（Route Handlerで処理する）。`onClick` で
  開始すると、ハイドレーション完了までボタンを押しても何も起きない状態が生まれる

設定方法・Redirect URLsの登録・画面確認用の認証バイパス（`DISABLE_AUTH`）は README「認証（Supabase Auth）」を参照。

## 検証コマンド

| 目的 | コマンド |
|---|---|
| Lint | `npm run lint` |
| 型チェック | `npm run typecheck` |
| まとめて（lint + typecheck） | `npm test` |
| ビルド | `npm run build:ci` |
| マイグレーション適用 | `npm run db:migrate:deploy` |

## 自動マージ不可カテゴリ

以下に該当する変更は自動マージせず `00.check-user` を付与してユーザーの確認を待つ。

- 認証・認可
- DBスキーマ変更・マイグレーション（`prisma/migrations/**`）
- 本番環境の設定
- GitHub Actionsやデプロイ設定（`.github/workflows/**`）
- Secretsや環境変数（`.env*`）
- 課金・決済
- 大規模な依存関係の更新
- `develop` → `main` のマージ

## 実装エージェントの禁止事項

- `main` / `develop` への直接コミット・push
- 他Issueのブランチの編集
- 不要なforce push
- 自分が作成したPull Requestの自己マージ

## コミット・PR・コメントの書き方

- コミットメッセージ・PRタイトル・PR本文・issueコメントは**日本語**で書く
- コミットの author は `Claude Code <claude-code@example.com>` にする
- `develop` 宛のPR本文には、対応Issue・実装内容・テスト内容・確認方法・注意点を記載する。
  developマージ時点ではissueをcloseしない運用のため、`closes #番号` / `fixes #番号` は使わず
  `#番号` のみ記載する

## 依存関係の追加

新しい依存関係を追加する前には、必ずユーザーに確認を取る。無人実行では確認相手がいないため、
追加が必要だと判断した場合は追加せずに作業を止め、`00.check-user` を付与したうえで
なぜ必要かをIssueコメントで相談する。
