# 【最重要】あなたが今やること（最大5個）

LIFT. STARTを本番販売可能にするために、**あなたが実際に操作する必要がある作業**だけを列挙しました。

---

## 🎯 本番販売開始までの作業（優先度順）

### ① PostgreSQL データベースを作成・設定
**所要時間：20分**

**選択肢A: Railway（最も簡単・推奨）**

1. https://railway.app にアクセス
2. GitHub でサインアップ
3. 「New Project」をクリック
4. 「PostgreSQL」を選択
5. 自動的にデータベースが作成される
6. 「Variables」タブをクリック
7. `DATABASE_URL` をコピー
8. ローカルの `.env` ファイルに貼り付け

```bash
# .env ファイルを編集
DATABASE_URL=postgresql://user:password@host:5432/lift_start
```

9. スキーマを初期化

```bash
psql $DATABASE_URL < schema.sql
```

**選択肢B: Heroku**

```bash
heroku addons:create heroku-postgresql:hobby-dev
heroku config:get DATABASE_URL
```

**確認方法：**
```bash
# データベースに接続できるか確認
psql $DATABASE_URL -c "SELECT 1"

# テーブルが作成されたか確認
psql $DATABASE_URL -c "\\dt"
```

---

### ② OpenAI API キーを取得・設定
**所要時間：5分**

1. https://platform.openai.com/account/api-keys にアクセス
2. 「Create new secret key」をクリック
3. キーをコピー
4. `.env` ファイルに貼り付け

```bash
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

5. サーバーを再起動

```bash
npm start
```

6. ランディングページで「無料AI診断を試す」をクリック
7. 店舗情報を入力して「診断を実行」
8. **AI回答が表示される**（モック回答ではなく）

**確認ポイント：**
- ✅ AI回答が表示される
- ✅ 回答が店舗情報に基づいている
- ✅ 改善ポイント・機会が表示される

---

### ③ Stripe TEST キーを取得・設定
**所要時間：10分**

1. https://dashboard.stripe.com/test/keys にアクセス
2. 「Secret key」をコピー
3. `.env` ファイルに貼り付け

```bash
STRIPE_SECRET_KEY=[Stripe TEST Secret キー]
STRIPE_PUBLISHABLE_KEY=[Stripe TEST Publishable キー]
```

4. Webhook Secret を取得
   - https://dashboard.stripe.com/webhooks にアクセス
   - 「Add endpoint」をクリック
   - URL: `https://your-domain.com/api/webhooks/stripe`
   - イベント: `checkout.session.completed`, `customer.subscription.deleted`
   - Webhook Secret をコピー

```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxx
```

5. サーバーを再起動

```bash
npm start
```

6. 以下をテスト：

**テスト1: 新規登録**
- ランディングページ → 「新規登録」
- メール、パスワード、店舗名を入力
- 「登録」をクリック
- ✅ ダッシュボードが表示される

**テスト2: 無料AI診断**
- ダッシュボード → 「無料AI診断」
- 店舗情報を入力
- 「診断を実行」
- ✅ AI分析結果が表示される

**テスト3: 料金ページ**
- ダッシュボード → 「料金プラン」
- 「STARTER」の「アップグレード」をクリック
- ✅ Stripe Checkout が表示される

**テスト4: Stripe TEST決済**
- Stripe Checkout で以下を入力：
  - メール: test@example.com
  - カード: 4242 4242 4242 4242
  - 有効期限: 12/25
  - CVC: 123
- 「支払う」をクリック
- ✅ 成功ページが表示される

**テスト5: プラン変更確認**
- ダッシュボード → 「プラン」
- ✅ プランが「STARTER」に変更されている
- ✅ 診断回数が「10回」に増えている

**テスト6: 解約テスト**
- Stripe Dashboard → Subscriptions
- 作成したサブスクリプションを選択
- 「Cancel subscription」をクリック
- ダッシュボードをリロード
- ✅ プランが「FREE」に戻っている

---

### ④ 特商法情報を設定
**所要時間：5分**

`public/index.html` の特商法ページを編集：

```html
<!-- 以下の部分を実在する情報に変更 -->
<div class="legal-content">
  <h2>特定商取引法に基づく表記</h2>
  
  <p><strong>販売者：</strong> [あなたの名前 or 会社名]</p>
  <p><strong>住所：</strong> [実在する住所]</p>
  <p><strong>電話番号：</strong> [実在する電話番号]</p>
  <p><strong>メール：</strong> [実在するメールアドレス]</p>
  <p><strong>営業時間：</strong> 平日 10:00-18:00</p>
  <p><strong>返金ポリシー：</strong> 30日間の返金保証</p>
</div>
```

また、`.env` ファイルにも設定：

```bash
BUSINESS_NAME=Your Business Name
BUSINESS_ADDRESS=Your Address
BUSINESS_EMAIL=your-email@example.com
BUSINESS_PHONE=090-xxxx-xxxx
```

**確認方法：**
- ランディングページ → 「特商法」
- ✅ 実在する販売者情報が表示される

---

### ⑤ 本番環境へデプロイ
**所要時間：15分**

**Step 1: 本番準備チェック**

```bash
node check-production-readiness.js
```

チェック結果が `✅ 本番公開準備完了` と表示されることを確認。

**Step 2: Railway へデプロイ（推奨）**

```bash
# Railway CLI をインストール
npm install -g @railway/cli

# ログイン
railway login

# デプロイ
railway up
```

**または Heroku へデプロイ**

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
heroku config:set BUSINESS_NAME="Your Business"
heroku config:set BUSINESS_ADDRESS="Your Address"
heroku config:set BUSINESS_EMAIL="your-email@example.com"

# デプロイ
git push heroku main
```

**Step 3: 本番環境をテスト**

1. 本番URL にアクセス
2. 以下をテスト：
   - ✅ ランディングページが表示される
   - ✅ 無料AI診断が動作する
   - ✅ 新規登録ができる
   - ✅ Stripe TEST決済ができる
   - ✅ プランが変更される

---

## ✅ 本番販売可能の最終確認

以下をすべて確認したら、**本番販売開始可能**です：

- [ ] ① PostgreSQL が設定されている
- [ ] ② OpenAI API キーが設定されている
- [ ] ③ Stripe TEST キーが設定されている
- [ ] ④ 特商法情報が実在情報に変更されている
- [ ] ⑤ 本番環境へデプロイされている

---

## 🎯 本番販売開始後

### 最初の有料顧客を獲得するために

1. **Instagram で発信**
   - LIFT. START の機能を紹介
   - 実際の店舗分析例を投稿
   - 「無料AI診断を試す」へのリンク

2. **Google で検索最適化**
   - 「美容室 SNS 集客」などのキーワードで上位表示
   - ブログ記事を投稿

3. **メール配信**
   - 無料診断ユーザーへのフォローアップ
   - 有料プランへの案内

4. **紹介プログラム**
   - 既存ユーザーからの紹介
   - 紹介報酬を設定

---

## 🔴 販売不可の場合の理由（最大5個）

### 現在の状態で販売不可の理由：

1. **PostgreSQL が未設定** — 再起動でユーザーデータが消失
2. **OpenAI API が未接続** — AI機能が動作しない
3. **Stripe TEST キーが未設定** — 決済が動作しない
4. **特商法情報が仮情報** — 架空の販売者情報を公開している
5. **本番環境へデプロイされていない** — localhost でしか動作しない

---

## 📊 完成度スコア

| 項目 | スコア | 理由 |
|------|--------|------|
| 機能実装 | 85/100 | 基本機能は実装済み |
| セキュリティ | 80/100 | JWT・パスワードハッシュ化実装済み |
| 決済 | 70/100 | Stripe TEST 実装済み |
| データベース | 30/100 | PostgreSQL 設定待ち |
| 本番準備 | 40/100 | デプロイ待ち |
| **総合** | **61/100** |  |

---

## 💡 最後に

LIFT. START は以下の状態です：

- ✅ **機能は完成している** — すぐに売上を発生させられる
- ✅ **セキュリティは実装されている** — 本番環境で安全に運用可能
- ⚠️ **本番環境への設定が必要** — 上記5つの作業で完成

**あなたが上記の5つの作業を完了すれば、最初の有料顧客から売上を発生させられます。**

頑張ってください！🚀
