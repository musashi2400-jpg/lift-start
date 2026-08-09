# LIFT. START MVP

AIを活用した小規模店舗向け集客支援サービス

## 概要

LIFT. STARTは、美容室・ネイル・整体・エステ・パーソナルジム向けのAI集客支援サービスです。

- **無料AI診断** — 店舗情報から集客課題を自動分析
- **投稿生成** — Instagram・Google投稿を自動生成（準備中）
- **月次レポート** — 施策効果を自動レポート（準備中）
- **料金プラン** — FREE / STARTER / PRO

## 起動方法

### 1. 環境構築

```bash
# リポジトリをクローン
cd /home/ubuntu/lift-start-mvp

# 依存関係をインストール
npm install

# 環境変数を設定
cp .env.example .env
```

### 2. 環境変数の設定

`.env` ファイルを編集して、以下を設定してください：

```env
# サーバー
PORT=3000
NODE_ENV=development

# JWT認証
JWT_SECRET=your-secret-key-here

# 管理者キー
ADMIN_KEY=dev-admin-key

# Stripe（本番環境）
STRIPE_SECRET_KEY=sk_test_xxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxx

# OpenAI（AI分析用）
OPENAI_API_KEY=sk-xxxx

# メール送信（準備中）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### 3. サーバー起動

```bash
# 開発環境で起動
npm start

# または
npm run dev

# サーバーは http://localhost:3000 で起動します
```

### 4. ブラウザでアクセス

```
http://localhost:3000
```

## 機能一覧

### ✅ 実装済み

- [x] ランディングページ
- [x] ユーザー登録・ログイン（JWT認証）
- [x] 無料AI診断（1回まで）
- [x] 業種切り替え（美容室・ネイル・整体・エステ・パーソナルジム）
- [x] ダッシュボード
- [x] プラン管理（FREE / STARTER / PRO）
- [x] 管理画面（顧客一覧・統計）
- [x] 利用規約・プライバシーポリシー・特商法ページ
- [x] スマホ対応

### 🔄 準備中

- [ ] PDF ダウンロード機能
- [ ] Stripe 決済統合（テスト環境）
- [ ] Instagram 投稿生成
- [ ] Google 投稿生成
- [ ] 月次レポート生成
- [ ] コンテンツカレンダー
- [ ] メール通知

### 🚀 今後実装予定

- [ ] OpenAI API 統合
- [ ] 画像生成機能
- [ ] SNS連携
- [ ] 本番環境デプロイ

## テストアカウント

### デモ用アカウント

```
メール: demo@liftstart.jp
パスワード: password123
```

### 管理者アカウント

```
メール: admin@lift.local
パスワード: admin123
```

## API エンドポイント

### 認証

- `POST /api/auth/register` — ユーザー登録
- `POST /api/auth/login` — ログイン

### AI診断

- `POST /api/diagnosis` — AI診断実行（認証必須）

### ユーザー

- `GET /api/user` — ユーザー情報取得（認証必須）
- `POST /api/upgrade` — プランアップグレード（認証必須）

### 管理者

- `GET /api/admin/users` — 全ユーザー一覧（管理者キー必須）
- `GET /api/admin/stats` — 統計情報取得（管理者キー必須）

### ヘルスチェック

- `GET /api/health` — サーバーステータス確認

## 本番公開方法

### 1. 環境変数の設定

```bash
# 本番環境用の .env ファイルを作成
NODE_ENV=production
JWT_SECRET=your-production-secret-key
ADMIN_KEY=your-production-admin-key
STRIPE_SECRET_KEY=sk_live_xxxx
OPENAI_API_KEY=sk-xxxx
```

### 2. クラウドデプロイ

#### Heroku にデプロイ

```bash
# Heroku CLI をインストール
# https://devcenter.heroku.com/articles/heroku-cli

# Heroku にログイン
heroku login

# アプリを作成
heroku create lift-start

# 環境変数を設定
heroku config:set JWT_SECRET=your-secret-key
heroku config:set ADMIN_KEY=your-admin-key
heroku config:set STRIPE_SECRET_KEY=sk_live_xxxx

# デプロイ
git push heroku main
```

#### Railway にデプロイ

```bash
# Railway CLI をインストール
# https://docs.railway.app/guides/cli

# ログイン
railway login

# デプロイ
railway up
```

#### Vercel にデプロイ

```bash
# Vercel CLI をインストール
npm install -g vercel

# デプロイ
vercel
```

### 3. データベース設定

**現在:** メモリ内データベース（アプリ再起動で消失）

**本番環境では PostgreSQL を推奨：**

```bash
# PostgreSQL 接続文字列を環境変数に設定
DATABASE_URL=postgresql://user:password@host:5432/lift_start
```

### 4. SSL/HTTPS 設定

本番環境では必ず HTTPS を有効にしてください。

- Heroku: 自動的に HTTPS が有効
- Railway: 自動的に HTTPS が有効
- Vercel: 自動的に HTTPS が有効

### 5. ドメイン設定

```bash
# カスタムドメインを設定
heroku domains:add liftstart.jp
```

## 必要な API キー

### Stripe（決済）

- テスト環境: https://dashboard.stripe.com/test/keys
- 本番環境: https://dashboard.stripe.com/keys

### OpenAI（AI分析）

- API キー取得: https://platform.openai.com/account/api-keys

### Google Maps（地図表示）

- API キー取得: https://console.cloud.google.com/

## トラブルシューティング

### ポート 3000 が使用中の場合

```bash
# ポート 3000 を使用しているプロセスを確認
lsof -i :3000

# プロセスを終了
kill -9 <PID>

# または別のポートで起動
PORT=3001 npm start
```

### npm install でエラーが出る場合

```bash
# キャッシュをクリア
npm cache clean --force

# 再度インストール
npm install
```

### JWT エラーが出る場合

- `.env` ファイルに `JWT_SECRET` が設定されているか確認
- トークンの有効期限を確認（7日間）

## セキュリティ

### 本番環境での対策

1. **環境変数の管理**
   - `.env` ファイルを `.gitignore` に追加
   - 本番環境では環境変数を安全に管理

2. **パスワード**
   - bcryptjs でハッシュ化（自動）
   - 最小8文字を推奨

3. **JWT トークン**
   - 7日間の有効期限
   - HTTPS 経由でのみ送信

4. **CORS 設定**
   - 本番環境では許可するオリジンを制限

5. **レート制限**
   - API呼び出しのレート制限を実装予定

## ライセンス

MIT

## サポート

問題が発生した場合は、以下をご確認ください：

1. `.env` ファイルが正しく設定されているか
2. `npm install` が正常に完了したか
3. ポート 3000 が使用可能か
4. Node.js のバージョンが 14 以上か

## 開発チーム

LIFT. START Development Team

## 更新履歴

### v1.0.0 (2026-08-06)

- 初版リリース
- ユーザー登録・ログイン機能
- 無料AI診断機能
- 管理画面
- 料金プラン管理
