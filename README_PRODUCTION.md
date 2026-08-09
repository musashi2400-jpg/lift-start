# LIFT. START - Production Deployment Guide

## 概要

LIFT. START は、小規模店舗向けのAI集客支援SaaS です。

- **無料AI診断** — 店舗情報から集客課題を自動分析
- **有料プラン** — STARTER ¥4,980/月、PRO ¥9,800/月
- **Stripe決済** — テストモード・本番モード対応
- **PostgreSQL** — 永続データベース

---

## 本番デプロイ手順

### Step 1: 環境変数を設定

```bash
# .env ファイルを作成
cp .env.example .env

# 以下の項目を実際の値に置き換え
DATABASE_URL=postgresql://user:password@host:5432/lift_start
OPENAI_API_KEY=sk-your-api-key
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_key
JWT_SECRET=$(openssl rand -base64 32)
ADMIN_KEY=$(openssl rand -base64 32)
FRONTEND_URL=https://your-domain.com
BUSINESS_NAME=Your Business Name
BUSINESS_ADDRESS=Your Address
BUSINESS_EMAIL=your-email@example.com
```

### Step 2: 本番準備チェック

```bash
# 環境変数をチェック
node check-production-readiness.js
```

チェック結果が `✅ 本番公開準備完了` と表示されたら、次のステップへ進みます。

### Step 3: データベースを初期化

```bash
# PostgreSQL に接続
psql $DATABASE_URL < schema.sql
```

### Step 4: 本番環境へデプロイ

#### Railway へのデプロイ（推奨）

```bash
# Railway CLI をインストール
npm install -g @railway/cli

# ログイン
railway login

# デプロイ
railway up
```

#### Heroku へのデプロイ

```bash
# Heroku CLI をインストール
brew install heroku/brew/heroku

# ログイン
heroku login

# アプリ作成
heroku create lift-start

# 環境変数設定
heroku config:set DATABASE_URL=postgresql://...
heroku config:set OPENAI_API_KEY=sk-...
heroku config:set STRIPE_SECRET_KEY=sk_test_...
heroku config:set STRIPE_PUBLISHABLE_KEY=pk_test_...
heroku config:set JWT_SECRET=$(openssl rand -base64 32)
heroku config:set ADMIN_KEY=$(openssl rand -base64 32)
heroku config:set FRONTEND_URL=https://your-domain.com
heroku config:set BUSINESS_NAME=Your Business
heroku config:set BUSINESS_ADDRESS=Your Address
heroku config:set BUSINESS_EMAIL=your-email@example.com

# デプロイ
git push heroku main
```

### Step 5: 本番チェック

```bash
# 本番URL にアクセス
https://your-domain.com

# 以下をテスト
1. ランディングページが表示される
2. 無料AI診断が動作する
3. 新規登録ができる
4. Stripe TEST決済ができる
5. プランが変更される
```

---

## 環境変数の詳細

### 必須項目

| 変数 | 説明 | 取得方法 |
|------|------|--------|
| **DATABASE_URL** | PostgreSQL接続文字列 | Railway / Heroku / AWS RDS |
| **JWT_SECRET** | JWT署名キー | `openssl rand -base64 32` |
| **ADMIN_KEY** | 管理者キー | `openssl rand -base64 32` |
| **STRIPE_SECRET_KEY** | Stripe Secret キー | https://dashboard.stripe.com/keys |
| **STRIPE_PUBLISHABLE_KEY** | Stripe Publishable キー | https://dashboard.stripe.com/keys |
| **FRONTEND_URL** | フロントエンドURL | https://your-domain.com |
| **BUSINESS_NAME** | 販売者名 | 実在する情報 |
| **BUSINESS_ADDRESS** | 販売者住所 | 実在する情報 |
| **BUSINESS_EMAIL** | 販売者メール | 実在する情報 |

### 推奨項目

| 変数 | 説明 | 取得方法 |
|------|------|--------|
| **OPENAI_API_KEY** | OpenAI API キー | https://platform.openai.com/account/api-keys |
| **STRIPE_WEBHOOK_SECRET** | Stripe Webhook Secret | https://dashboard.stripe.com/webhooks |
| **SMTP_HOST** | メールサーバー | smtp.gmail.com |
| **SMTP_USER** | メールユーザー | your-email@gmail.com |
| **SMTP_PASSWORD** | メールパスワード | アプリパスワード |

---

## Stripe 設定

### TEST MODE（開発・テスト）

1. https://dashboard.stripe.com/test/keys にアクセス
2. Secret Key と Publishable Key をコピー
3. `.env` に設定

```env
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
```

### LIVE MODE（本番）

**注意：本番Stripe切り替えは慎重に実施してください**

1. https://dashboard.stripe.com/keys にアクセス
2. Secret Key と Publishable Key をコピー
3. `.env` に設定

```env
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
```

### Webhook設定

1. https://dashboard.stripe.com/webhooks にアクセス
2. 「エンドポイントを追加」をクリック
3. URL: `https://your-domain.com/api/webhooks/stripe`
4. イベント: `checkout.session.completed`, `customer.subscription.deleted`
5. Webhook Secret をコピー
6. `.env` に設定

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

---

## PostgreSQL 設定

### Railway

1. https://railway.app にサインアップ
2. 新しいプロジェクトを作成
3. PostgreSQL を追加
4. DATABASE_URL をコピー

### Heroku

```bash
heroku addons:create heroku-postgresql:hobby-dev
heroku config:get DATABASE_URL
```

### AWS RDS

1. AWS RDS で PostgreSQL インスタンスを作成
2. DATABASE_URL を構築

```
postgresql://username:password@host:5432/database_name
```

---

## OpenAI API 設定

1. https://platform.openai.com/account/api-keys にアクセス
2. 新しい API キーを生成
3. `.env` に設定

```env
OPENAI_API_KEY=sk-xxxxx
```

**注意：API キーは秘密です。コードに埋め込まないでください。**

---

## メール設定（オプション）

### Gmail

1. https://myaccount.google.com/apppasswords にアクセス
2. アプリパスワードを生成
3. `.env` に設定

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

---

## トラブルシューティング

### Database接続エラー

```bash
# DATABASE_URL を確認
echo $DATABASE_URL

# PostgreSQL に直接接続してテスト
psql $DATABASE_URL -c "SELECT 1"
```

### Stripe エラー

```bash
# Stripe キーを確認
echo $STRIPE_SECRET_KEY

# Webhook Secret を確認
echo $STRIPE_WEBHOOK_SECRET
```

### OpenAI エラー

```bash
# API キーを確認
echo $OPENAI_API_KEY

# API キーが有効か確認
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

---

## 本番監視

### ログを確認

```bash
# Heroku
heroku logs --tail

# Railway
railway logs
```

### 本番チェック

```bash
# 本番環境で準備チェックを実行
node check-production-readiness.js
```

---

## セキュリティ

- ✅ パスワードは bcryptjs でハッシュ化
- ✅ JWT トークンで認証
- ✅ API キーは環境変数で管理
- ✅ ユーザーデータは分離
- ✅ Stripe Webhook は署名検証

---

## サポート

問題が発生した場合は、以下をご確認ください：

1. `.env` ファイルが正しく設定されているか
2. PostgreSQL が起動しているか
3. Stripe キーが正しいか
4. OpenAI API キーが正しいか
5. ネットワーク接続が正常か
