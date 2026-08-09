# LIFT. START - GitHub エクスポート準備チェックリスト

## 準備完了項目

✅ **セキュリティ対策**
- `.gitignore` 作成済み
- `.env` ファイルが除外対象
- `node_modules/` が除外対象
- `package-lock.json` は含まれる（デプロイに必須）
- 秘密情報がコード内に埋め込まれていない

✅ **デプロイ設定**
- `render.yaml` 作成済み
- 環境変数テンプレート作成済み
- Render デプロイガイド作成済み
- 環境変数セットアップガイド作成済み

✅ **コード品質**
- 既存機能は変更なし
- Neon PostgreSQL 接続は保持
- OpenAI 連携は保持
- Stripe 連携は保持
- JWT 認証は保持

✅ **ドキュメント**
- README.md（既存）
- README_PRODUCTION.md（既存）
- RENDER_DEPLOYMENT.md（新規）
- ENVIRONMENT_SETUP.md（新規）

---

## GitHub エクスポート手順

### ステップ 1：Manus スマホアプリで GitHub エクスポート

1. **Manus スマホアプリを開く**

2. **プロジェクト一覧から `lift-start-mvp` を選択**

3. **メニュー（⋯ または More）をタップ**

4. **「Export to GitHub」または「GitHub へエクスポート」を選択**

5. **以下を入力：**
   - **Repository name**: `lift-start`
   - **Owner**: あなたの GitHub ユーザー名
   - **Description**: `LIFT. START - AI-powered beauty salon marketing platform`
   - **Visibility**: Public または Private（推奨：Private）

6. **「Export」をクリック**

7. **GitHub 認証を求められたら、GitHub アカウントでログイン**

### ステップ 2：GitHub リポジトリの確認

1. **GitHub にログイン**
2. **新しいリポジトリ `lift-start` が作成されているか確認**
3. **以下のファイルが含まれているか確認：**
   - ✅ `server.js`
   - ✅ `package.json`
   - ✅ `schema.sql`
   - ✅ `public/index.html`
   - ✅ `.gitignore`
   - ✅ `render.yaml`
   - ✅ `RENDER_DEPLOYMENT.md`
   - ✅ `ENVIRONMENT_SETUP.md`
   - ❌ `.env`（含まれていないことを確認）

### ステップ 3：リポジトリ設定

1. **GitHub リポジトリ → Settings**
2. **Secrets and variables → Actions → New repository secret**
3. 以下は設定しない（Render で設定するため）
   - DATABASE_URL
   - OPENAI_API_KEY
   - STRIPE_SECRET_KEY

---

## 次のステップ

### Render へのデプロイ

1. **Render にログイン**
2. **New → Web Service**
3. **GitHub リポジトリを選択**
4. **環境変数を設定**
5. **デプロイ実行**

### 環境変数の設定

1. **Render Dashboard → Environment**
2. **以下の環境変数を入力：**
   - `DATABASE_URL` = Neon PostgreSQL URL
   - `OPENAI_API_KEY` = OpenAI API キー
   - `STRIPE_SECRET_KEY` = Stripe TEST Secret キー
   - `STRIPE_PUBLISHABLE_KEY` = Stripe TEST Publishable キー
   - `STRIPE_WEBHOOK_SECRET` = Stripe Webhook Secret
   - `JWT_SECRET` = 生成されたランダム値
   - `ADMIN_KEY` = 生成されたランダム値
   - `FRONTEND_URL` = `https://lift-start.onrender.com`
   - `NODE_ENV` = `production`

### 動作テスト

1. **デプロイ完了後、`https://lift-start.onrender.com` にアクセス**
2. **ランディングページが表示されるか確認**
3. **新規登録 → ログイン → AI診断 をテスト**
4. **Stripe TEST 決済をテスト**

---

## 重要な注意事項

⚠️ **秘密情報の管理**
- `.env` ファイルは絶対に GitHub にコミットしないでください
- APIキーは Render の環境変数で管理してください
- 本番環境では LIVE キーに切り替えてください

⚠️ **Stripe の設定**
- 現在は TEST モードです
- 本番販売前に LIVE キーに切り替えてください
- Webhook Secret も更新してください

⚠️ **データベース**
- Neon PostgreSQL のデータは保持されます
- 本番環境でも同じ Neon インスタンスを使用できます
- バックアップを定期的に取得してください

---

## サポート

問題が発生した場合：

1. **Render ログを確認**：Render Dashboard → Logs
2. **GitHub Actions を確認**：GitHub → Actions
3. **RENDER_DEPLOYMENT.md を参照**
4. **ENVIRONMENT_SETUP.md を参照**
