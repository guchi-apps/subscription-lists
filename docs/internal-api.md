# サーバー間参照用API（`/api/internal/*`）

同一VPS上で動く他アプリ（現状は [guchi-apps/aide](https://github.com/guchi-apps/aide)）が、月額固定費と次の支払予定を参照するためのGET API。ブラウザからの利用は想定しておらず、NextAuthのセッションではなく**共有シークレット1本**で守る。

- 経緯: guchi-apps/subscription-lists#72、guchi-apps/aide#27、guchi-apps/question#7
- 到達経路: 本アプリはVPS上で `127.0.0.1:3107`（`deploy/ecosystem.config.js` の `PORT`）で待ち受ける。呼び出し元も同じVPS上にいるため、**このAPIを外部公開する必要はない**

## 認証

```
Authorization: Bearer <INTERNAL_API_KEY>
```

| 状況 | 応答 |
| --- | --- |
| `INTERNAL_API_KEY` が未設定 | `503`（機能として無効。設定漏れが「認証なしの公開」に化けないようにしている） |
| ヘッダなし・キー不一致 | `401` |
| 一致 | `200` |

キーの比較は `node:crypto` の `timingSafeEqual` で定数時間で行う（`src/lib/internal-auth.ts`）。

**対象ユーザーは `ALLOWED_EMAIL`（ログインを許可するメールアドレス）で引く。** 利用者が1人だけの前提のため、APIキーとユーザーの対応表はDBに持っていない。複数ユーザーを扱う必要が出た時点で対応表を導入する。

## `GET /api/internal/subscriptions`

契約中のサブスクリプションを、**月額換算・次回支払日・契約状況を算出済みの形で**返す。

月末クランプ（`billingDay=31` の2月は28日/29日）、料金改定履歴の期間切り替え、`billingInterval` のサイクル判定といったロジックは `src/lib/billing.ts` にあり、呼び出し側で再実装すると必ずズレる。そのためこのAPIが計算まで済ませ、根拠となる「現在適用中の料金改定」の生の値を `currentPrice` として併記する。

### クエリパラメータ

| 名前 | 既定 | 内容 |
| --- | --- | --- |
| `includeEnded` | `false` | `true` にすると契約状況が `ENDED`（解約済み）のものも含める |
| `referenceDate` | サーバー時刻 | `YYYY-MM-DD`。月額換算・次回支払日・契約状況を判定する基準日。形式が不正なら `400` |

> **`referenceDate` を渡すことを推奨する。** VPSのタイムゾーンはUTCのため、省略すると日本時間の 00:00〜09:00 は「前日」を基準に計算される。呼び出し側でJSTの日付を作って渡せばこのズレを避けられる。

### レスポンス

```jsonc
{
  "generatedAt": "2026-08-15T20:00:00.000Z",
  "referenceDate": "2026-08-15",
  "usdJpyRate": 152.3,              // 取得できなければ null
  "totals": {
    "monthlyByCurrency": { "JPY": 12345, "USD": 25.98 },
    "monthlyJpy": 16300             // 参考値。円換算できないものが1件でもあれば null
  },
  "subscriptions": [
    {
      "id": "ckxxx",
      "name": "Netflix",
      "paymentMethod": "楽天カード",
      "labels": ["動画配信"],
      "contractStatus": "AUTO_RENEWING",   // AUTO_RENEWING | SCHEDULED_TO_END | ENDED
      "startDate": "2023-04-01",
      "endDate": null,
      "autoRenew": true,
      "currentPrice": {
        "amount": 1490,
        "currency": "JPY",                 // JPY | USD
        "billingCycle": "MONTHLY",          // MONTHLY | YEARLY
        "billingInterval": 1,               // 何ヶ月/何年ごとか
        "billingDay": 5,
        "billingMonth": null,               // YEARLY のときのみ 1-12
        "effectiveFrom": "2024-06-01"
      },
      "monthlyAmount": 1490,                // currentPrice の通貨のままの月額換算
      "monthlyAmountJpy": 1490,             // 参考値。USD かつレート未取得なら null
      "nextPayment": { "date": "2026-09-05", "amount": 1490, "currency": "JPY" }
    }
  ]
}
```

### 通貨の扱い

`Currency` は `JPY` / `USD` の混在を許している。

- **明細と合計は元通貨のまま返す。** `totals.monthlyByCurrency` は通貨別で、通貨をまたいだ加算はしていない
- **円換算は参考値。** `usdJpyRate` は [Frankfurter](https://frankfurter.app/) から取得している（`src/lib/exchange-rate.ts`、6時間キャッシュ）。取得に失敗すると `usdJpyRate` と `monthlyAmountJpy` が `null` になり、`totals.monthlyJpy` も `null` になる
- **円換算した値（`monthlyAmountJpy` / `totals.monthlyJpy`）は整数に丸める。** `totals.monthlyJpy` は丸めたあとの明細を足した値なので、明細を足し上げた額と必ず一致する
- レートが日次更新である以上、`monthlyJpy` は概算。厳密な金額が要る用途では `monthlyByCurrency` を使う

### 注意点

- `nextPayment` は最大3年先まで探索して見つからなければ `null`（解約済み等）
- 料金改定が1件も無いサブスクは金額を決められないため、結果から除外される（通常は作成時に必ず1件作られる）
- 金額はすべてJSONの数値。Prismaの `Decimal` を文字列のまま返さないよう明示的に変換している

## 動作確認

```bash
curl -s -H "Authorization: Bearer $INTERNAL_API_KEY" \
  "http://127.0.0.1:3107/api/internal/subscriptions?referenceDate=$(TZ=Asia/Tokyo date +%F)" | jq .

# 解約済みも含める
curl -s -H "Authorization: Bearer $INTERNAL_API_KEY" \
  "http://127.0.0.1:3107/api/internal/subscriptions?includeEnded=true" | jq .

# 認証エラー（401 が返る）
curl -s -o /dev/null -w '%{http_code}\n' "http://127.0.0.1:3107/api/internal/subscriptions"
```

ローカル開発では `.env.local` に `INTERNAL_API_KEY` を設定する（本番の値は使わない）。ポートは `npm run dev` の `PORT`。

## 環境変数の配線

| 場所 | 設定 |
| --- | --- |
| 1Password | `apps/subscribe-lists` の `internal-api-key` フィールド（**正**） |
| GitHub Secret | `INTERNAL_API_KEY`。`scripts/sync-github-secrets.sh --only INTERNAL_API_KEY` で1Passwordから同期する |
| 対応表 | `.github/secrets-manifest.tsv` |
| 本番 `.env` | `.github/workflows/deploy.yml` が `update_env` で書き込む |

キーを更新するときは、1Passwordの値を変えてから `sync-github-secrets.sh` を実行し、再デプロイする。**呼び出し元（AIDE）側の値も同時に更新しないと連携が止まる。**
