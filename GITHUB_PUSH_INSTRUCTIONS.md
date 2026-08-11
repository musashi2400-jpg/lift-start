# LIFT. START - GitHub へのプッシュ手順

## 現在の状態

✅ ローカル git リポジトリが初期化されました
✅ 初回コミットが完了しました
✅ `.env` ファイルは除外されています（秘密情報は保護されています）

---

## GitHub へプッシュするための手順

### ステップ 1：GitHub で新しいリポジトリを作成

1. https://github.com/new にアクセス
2. 以下を入力：
   - **Repository name**: `lift-start`
   - **Description**: `LIFT. START - AI-powered beauty salon marketing platform`
   - **Visibility**: Private（推奨）または Public
   - **Initialize this repository with**: チェックなし（既にローカルで初期化済み）

3. **Create repository** をクリック

### ステップ 2：ローカルリポジトリをリモートに接続

GitHub リポジトリが作成されたら、以下のコマンドを実行してください：

```bash
cd /home/ubuntu/lift-start-mvp

# リモートリポジトリを追加（YOUR_USERNAME を自分の GitHub ユーザー名に置き換え）
git remote add origin https://github.com/YOUR_USERNAME/lift-start.git

# ブランチを main に変更（GitHub のデフォルト）
git branch -m master main

# GitHub にプッシュ
git push -u origin main
```

**例：**
```bash
git remote add origin https://github.com/john-doe/lift-start.git
git branch -m master main
git push -u origin main
```

### ステップ 3：GitHub リポジトリの確認

1. https://github.com/YOUR_USERNAME/lift-start にアクセス
2. 以下のファイルが表示されているか確認：
   - ✅ `server.js`
   - ✅ `package.json`
   - ✅ `schema.sql`
   - ✅ `public/index.html`
   - ✅ `.gitignore`
   - ✅ `render.yaml`
   - ✅ `RENDER_DEPLOYMENT.md`
   - ✅ `ENVIRONMENT_SETUP.md`
   - ❌ `.env`（表示されていないことを確認）

---

## SSH キーを使用する場合

SSH キーが設定されている場合は、以下を使用：

```bash
git remote add origin git@github.com:YOUR_USERNAME/lift-start.git
git branch -m master main
git push -u origin main
```

---

## トラブルシューティング

### 「fatal: remote origin already exists」エラー

```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/lift-start.git
git push -u origin main
```

### 「Permission denied」エラー

1. GitHub 認証を確認
2. SSH キーが設定されているか確認
3. Personal Access Token を使用する場合は、トークンが有効か確認

### プッシュが失敗する場合

```bash
# 強制的にプッシュ（注意：既存のコミットを上書きします）
git push -u origin main --force
```

---

## 次のステップ

GitHub へのプッシュが完了したら：

1. **Render でデプロイ準備**
   - Render にログイン
   - New → Web Service
   - GitHub リポジトリを選択
   - 環境変数を設定

2. **環境変数の設定**
   - DATABASE_URL（Neon PostgreSQL）
   - OPENAI_API_KEY（OpenAI）
   - STRIPE_SECRET_KEY（Stripe TEST）
   - その他の環境変数

3. **デプロイ実行**
   - Render で「Deploy」をクリック
   - ログを確認してデプロイ完了を待つ

---

## 重要な注意事項

⚠️ **秘密情報は GitHub にコミットされていません**
- `.env` ファイルは `.gitignore` に含まれているため、GitHub にアップロードされません
- 環境変数は Render で設定してください

⚠️ **Personal Access Token の使用**
- パスワード認証は GitHub で廃止されています
- Personal Access Token を使用してください
- https://github.com/settings/tokens で生成できます

---

## サポート

問題が発生した場合：

1. **GitHub ドキュメント**: https://docs.github.com
2. **Render ドキュメント**: https://render.com/docs
3. **RENDER_DEPLOYMENT.md** を参照
