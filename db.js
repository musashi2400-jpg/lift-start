/**
 * LIFT. START - Database Module
 * PostgreSQL統合
 */

import pkg from 'pg';
const { Pool } = pkg;

let pool = null;

/**
 * データベース接続を初期化
 */
export function initializeDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.warn('⚠️ DATABASE_URL が設定されていません。メモリ内DBを使用します。');
    return false;
  }

  try {
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    pool.on('error', (err) => {
      console.error('❌ Database pool error:', err);
    });

    console.log('✅ PostgreSQL接続成功');
    return true;
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    return false;
  }
}

/**
 * クエリを実行
 */
export async function query(text, params = []) {
  if (!pool) {
    throw new Error('Database not initialized');
  }

  try {
    const result = await pool.query(text, params);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * トランザクションを実行
 */
export async function transaction(callback) {
  if (!pool) {
    throw new Error('Database not initialized');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * ユーザーを作成
 */
export async function createUser(email, passwordHash, shopName, industry, websiteUrl) {
  const text = `
    INSERT INTO users (email, password_hash, shop_name, industry, website_url)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, email, shop_name, plan
  `;
  const result = await query(text, [email, passwordHash, shopName, industry, websiteUrl]);
  return result[0];
}

/**
 * ユーザーをメールで取得
 */
export async function getUserByEmail(email) {
  const text = 'SELECT * FROM users WHERE email = $1';
  const result = await query(text, [email]);
  return result[0];
}

/**
 * ユーザーをIDで取得
 */
export async function getUserById(userId) {
  const text = 'SELECT * FROM users WHERE id = $1';
  const result = await query(text, [userId]);
  return result[0];
}

/**
 * ユーザープランを更新
 */
export async function updateUserPlan(userId, plan) {
  const diagnosisLimits = {
    free: 1,
    starter: 10,
    pro: 999
  };

  const text = `
    UPDATE users
    SET plan = $1, diagnosis_limit = $2, updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING *
  `;
  const result = await query(text, [plan, diagnosisLimits[plan] || 1, userId]);
  return result[0];
}

/**
 * 診断を作成
 */
export async function createDiagnosis(userId, shopName, industry, issues, analysis, aiUsed) {
  const text = `
    INSERT INTO diagnoses (user_id, shop_name, industry, issues, improvements, opportunities, expected_results, ai_used)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
  const result = await query(text, [
    userId,
    shopName,
    industry,
    JSON.stringify(issues),
    JSON.stringify(analysis.improvements),
    JSON.stringify(analysis.opportunities),
    JSON.stringify(analysis.expectedResults),
    aiUsed
  ]);
  return result[0];
}

/**
 * 診断数をインクリメント
 */
export async function incrementDiagnosisCount(userId) {
  const text = `
    UPDATE users
    SET diagnosis_count = diagnosis_count + 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING diagnosis_count, diagnosis_limit
  `;
  const result = await query(text, [userId]);
  return result[0];
}

/**
 * 購読を作成
 */
export async function createSubscription(userId, plan, stripeSessionId, stripeSubscriptionId) {
  const text = `
    INSERT INTO subscriptions (user_id, plan, stripe_session_id, stripe_subscription_id, status)
    VALUES ($1, $2, $3, $4, 'active')
    RETURNING *
  `;
  const result = await query(text, [userId, plan, stripeSessionId, stripeSubscriptionId]);
  return result[0];
}

/**
 * 購読を更新
 */
export async function updateSubscription(subscriptionId, status) {
  const text = `
    UPDATE subscriptions
    SET status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const result = await query(text, [status, subscriptionId]);
  return result[0];
}

/**
 * 支払いを記録
 */
export async function recordPayment(userId, subscriptionId, amountCents, stripePaymentIntentId) {
  const text = `
    INSERT INTO payments (user_id, subscription_id, amount_cents, stripe_payment_intent_id, status)
    VALUES ($1, $2, $3, $4, 'succeeded')
    RETURNING *
  `;
  const result = await query(text, [userId, subscriptionId, amountCents, stripePaymentIntentId]);
  return result[0];
}

/**
 * 分析イベントを記録
 */
export async function recordAnalyticsEvent(event, userId, metadata) {
  const text = `
    INSERT INTO analytics_events (event, user_id, metadata)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  const result = await query(text, [event, userId, JSON.stringify(metadata)]);
  return result[0];
}

/**
 * 統計情報を取得
 */
export async function getStatistics() {
  const totalUsers = await query('SELECT COUNT(*) as count FROM users');
  const freeUsers = await query("SELECT COUNT(*) as count FROM users WHERE plan = 'free'");
  const starterUsers = await query("SELECT COUNT(*) as count FROM users WHERE plan = 'starter'");
  const proUsers = await query("SELECT COUNT(*) as count FROM users WHERE plan = 'pro'");
  const totalDiagnoses = await query('SELECT COUNT(*) as count FROM diagnoses');
  const activeSubscriptions = await query("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'");

  return {
    totalUsers: totalUsers[0]?.count || 0,
    freeUsers: freeUsers[0]?.count || 0,
    starterUsers: starterUsers[0]?.count || 0,
    proUsers: proUsers[0]?.count || 0,
    totalDiagnoses: totalDiagnoses[0]?.count || 0,
    activeSubscriptions: activeSubscriptions[0]?.count || 0,
    monthlyRecurringRevenue: (
      (starterUsers[0]?.count || 0) * 4980 +
      (proUsers[0]?.count || 0) * 9800
    ) / 100
  };
}

/**
 * 全ユーザーを取得（管理画面用）
 */
export async function getAllUsers() {
  const text = `
    SELECT id, email, shop_name, industry, plan, diagnosis_count, created_at
    FROM users
    ORDER BY created_at DESC
  `;
  return await query(text);
}

/**
 * データベース接続をクローズ
 */
export async function closeDatabase() {
  if (pool) {
    await pool.end();
    console.log('✅ Database connection closed');
  }
}
