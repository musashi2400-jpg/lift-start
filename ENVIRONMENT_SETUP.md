# LIFT. START - 環境変数セットアップガイド

## 概要

本番環境へのデプロイには、以下の環境変数が必須です。

**重要：**
- 秘密情報（APIキー等）は絶対に GitHub にコミットしないでください
- 本番環境では強力なランダム値を使用してください
- 開発環境と本番環境で異なるキーを使用してください

---

## 必須環境変数

### 1. DATABASE_URL（Neon PostgreSQL）

**取得方法：**

1. https://console.neon.tech にログイン
2. プロジェクト → Connection String をコピー
3. 形式：`postgresql://user:password@host/dbname?sslmode=require`

**例：**
```
postgresql://neondb_owner:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### 2. OPENAI_API_KEY（OpenAI）

**取得方法：**

1. https://platform.openai.com/account/api-keys にログイン
2. 「Create new secret key」をクリック
3. キーをコピー
4. 形式：`sk-proj-...`

**重要：**
- API キーは絶対に GitHub にコミットしないでください
- 定期的にキーをローテーションしてください
- 不要なキーは削除してください

### 3. STRIPE_SECRET_KEY（Stripe TEST）

**取得方法：**

1. https://dashboard.stripe.com/test/apikeys にログイン
2. 「Secret key」をコピー
3. 形式：`sk_test_...`

**本番環境への切り替え：**

1. https://dashboard.stripe.com/apikeys にログイン（TEST タブを LIVE に切り替え）
2. 「Secret key」をコピー
3. 形式：`sk_live_...`

### 4. STRIPE_PUBLISHABLE_KEY（Stripe TEST）

**取得方法：**

1. https://dashboard.stripe.com/test/apikeys にログイン
2. 「Publishable key」をコピー
3. 形式：`pk_test_...`

### 5. STRIPE_WEBHOOK_SECRET（Stripe Webhook）

**取得方法：**

1. https://dashboard.stripe.com/test/webhooks にログイン
2. Endpoint を作成または選択
3. 「Signing secret」をコピー
4. 形式：`whsec_...`

**Webhook エンドポイント設定：**

- URL: `https://your-domain.com/api/webhook/stripe`
- Events: `checkout.session.completed`, `customer.subscription.deleted`

### 6. JWT_SECRET（JWT 署名用）

**生成方法：**

```bash
# Linux/Mac
openssl rand -base64 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

**例：**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

### 7. ADMIN_KEY（管理画面アクセス用）

**生成方法：**

```bash
openssl rand -base64 32
```

### 8. FRONTEND_URL（フロントエンド URL）

**本番環境の場合：**

```
https://lift-start.onrender.com
```

**または、カスタムドメインを使用：**

```
https://lift.example.com
```

### 9. NODE_ENV（実行環境）

```
production
```

---

## 環境変数の設定方法

### Render での設定

1. Render Dashboard にログイン
2. Web Service → Environment
3. 各環境変数を入力
4. 「Save」をクリック
5. 自動的にデプロイが再実行される

### ローカル開発環境での設定

`.env` ファイルを作成：

```
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-proj-...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
JWT_SECRET=...
ADMIN_KEY=...
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

**重要：`.env` は `.gitignore` に含まれているため、GitHub にコミットされません。**

---

## セキュリティチェック

デプロイ前に以下を確認してください：

- [ ] `.env` ファイルが `.gitignore` に含まれている
- [ ] `package-lock.json` が `.gitignore` に含まれていない（デプロイに必要）
- [ ] `node_modules/` が `.gitignore` に含まれている
- [ ] APIキーが GitHub にコミットされていない
- [ ] 本番環境で開発用キーを使用していない
- [ ] JWT_SECRET と ADMIN_KEY が強力なランダム値

---

## トラブルシューティング

### 環境変数が読み込まれない

1. Render Dashboard で環境変数が正しく設定されているか確認
2. デプロイが完了しているか確認
3. アプリケーションログを確認

### API キーが無効

1. キーが有効か確認
2. キーが正しくコピーされているか確認
3. 余分なスペースが含まれていないか確認
4. キーをローテーションして新しいキーを使用

---

## 本番環境への移行チェックリスト

- [ ] DATABASE_URL が本番 Neon に設定されている
- [ ] OPENAI_API_KEY が有効で、クレジットがある
- [ ] Stripe TEST キーで動作確認が完了
- [ ] Stripe LIVE キーに切り替え準備完了
- [ ] JWT_SECRET と ADMIN_KEY が強力なランダム値
- [ ] FRONTEND_URL が本番ドメイン
- [ ] NODE_ENV が `production`
- [ ] `.env` が `.gitignore` に含まれている
- [ ] GitHub にコミット前に秘密情報を確認
- [ ] デプロイ後に動作確認を実施
