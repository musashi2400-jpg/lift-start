# LIFT. START - Render デプロイガイド

## 前提条件

- GitHub リポジトリが作成されている
- Render アカウントが作成されている
- Neon PostgreSQL が作成されている

## デプロイ手順

### 1. Render にログイン

https://render.com にアクセスしてログイン

### 2. 新しい Web Service を作成

1. Dashboard → New → Web Service
2. GitHub リポジトリを選択（`lift-start`）
3. 以下を設定：
   - **Name**: `lift-start`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Starter (無料)

### 3. 環境変数を設定

Render Dashboard で以下の環境変数を設定：

```
DATABASE_URL = postgresql://...（Neon から取得）
OPENAI_API_KEY = sk-proj-...（OpenAI から取得）
STRIPE_SECRET_KEY = sk_test_...（Stripe から取得）
STRIPE_PUBLISHABLE_KEY = pk_test_...（Stripe から取得）
STRIPE_WEBHOOK_SECRET = whsec_...（Stripe Webhook から取得）
JWT_SECRET = （強力なランダム値を生成）
ADMIN_KEY = （強力なランダム値を生成）
FRONTEND_URL = https://lift-start.onrender.com
NODE_ENV = production
```

### 4. デプロイ実行

1. Render Dashboard で「Deploy」をクリック
2. ログを確認してデプロイ完了を待つ
3. デプロイ完了後、`https://lift-start.onrender.com` にアクセス

### 5. 動作確認

1. ランディングページが表示されるか確認
2. 新規登録 → ログイン → AI診断 の流れをテスト
3. Stripe TEST 決済をテスト

## トラブルシューティング

### デプロイが失敗する場合

1. Render ログを確認
2. `npm install` が成功しているか確認
3. `npm start` が正常に起動しているか確認
4. 環境変数が正しく設定されているか確認

### データベース接続エラー

1. `DATABASE_URL` が正しいか確認
2. Neon が稼働しているか確認
3. SSL 設定が有効か確認（`?sslmode=require`）

### OpenAI API エラー

1. `OPENAI_API_KEY` が正しいか確認
2. OpenAI アカウントにクレジットがあるか確認
3. API キーが有効か確認

## 本番環境への切り替え

### Stripe LIVE キーへの切り替え

1. Stripe Dashboard で LIVE キーを取得
2. Render 環境変数を更新：
   - `STRIPE_SECRET_KEY` = `sk_live_...`
   - `STRIPE_PUBLISHABLE_KEY` = `pk_live_...`
3. Webhook Secret も更新
4. デプロイ再実行

### カスタムドメインの設定

1. Render Dashboard → Settings → Custom Domain
2. ドメインを入力
3. DNS レコードを設定
4. SSL 証明書が自動生成される

## 環境変数の生成

### JWT_SECRET と ADMIN_KEY の生成

```bash
# Linux/Mac
openssl rand -base64 32

# または
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## ロールバック

デプロイに問題がある場合：

1. Render Dashboard → Deployments
2. 前のバージョンを選択
3. 「Redeploy」をクリック

## サポート

問題が発生した場合：

1. Render ドキュメント: https://render.com/docs
2. LIFT. START README: README_PRODUCTION.md
3. GitHub Issues で報告
