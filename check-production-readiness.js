#!/usr/bin/env node

/**
 * LIFT. START - Production Readiness Check
 * 
 * 本番環境へのデプロイ前に実行してください
 * 必要な環境変数とシステム設定を確認します
 */

import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const checks = {
  critical: [],
  warnings: [],
  info: []
};

function checkCritical(name, condition, message) {
  if (!condition) {
    checks.critical.push(`❌ ${name}: ${message}`);
  } else {
    checks.info.push(`✅ ${name}`);
  }
}

function checkWarning(name, condition, message) {
  if (!condition) {
    checks.warnings.push(`⚠️ ${name}: ${message}`);
  } else {
    checks.info.push(`✅ ${name}`);
  }
}

console.log('🔍 LIFT. START - Production Readiness Check\n');

// ============================================================
// Critical Checks (本番公開に必須)
// ============================================================
console.log('【Critical Checks】\n');

checkCritical(
  'Database Configuration',
  process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgresql'),
  'DATABASE_URL が設定されていないか、PostgreSQL ではありません。\n  設定例: postgresql://user:password@host:5432/lift_start'
);

checkCritical(
  'JWT Secret',
  process.env.JWT_SECRET && process.env.JWT_SECRET !== 'dev-secret-key-change-in-production',
  'JWT_SECRET が設定されていないか、開発用のままです。\n  実行: openssl rand -base64 32'
);

checkCritical(
  'Admin Key',
  process.env.ADMIN_KEY && process.env.ADMIN_KEY !== 'dev-admin-key',
  'ADMIN_KEY が設定されていないか、開発用のままです。\n  実行: openssl rand -base64 32'
);

checkCritical(
  'Stripe Secret Key',
  process.env.STRIPE_SECRET_KEY && (process.env.STRIPE_SECRET_KEY.startsWith('sk_test_') || process.env.STRIPE_SECRET_KEY.startsWith('sk_live_')),
  'STRIPE_SECRET_KEY が設定されていないか、形式が正しくありません。\n  取得: https://dashboard.stripe.com/keys'
);

checkCritical(
  'Stripe Publishable Key',
  process.env.STRIPE_PUBLISHABLE_KEY && (process.env.STRIPE_PUBLISHABLE_KEY.startsWith('pk_test_') || process.env.STRIPE_PUBLISHABLE_KEY.startsWith('pk_live_')),
  'STRIPE_PUBLISHABLE_KEY が設定されていないか、形式が正しくありません。\n  取得: https://dashboard.stripe.com/keys'
);

checkCritical(
  'Frontend URL',
  process.env.FRONTEND_URL && process.env.FRONTEND_URL !== 'http://localhost:3000',
  'FRONTEND_URL が設定されていないか、localhost のままです。\n  設定例: https://your-domain.com'
);

checkCritical(
  'Business Information',
  process.env.BUSINESS_NAME && process.env.BUSINESS_ADDRESS && process.env.BUSINESS_EMAIL,
  '特商法表記の情報が不完全です。\n  必須: BUSINESS_NAME, BUSINESS_ADDRESS, BUSINESS_EMAIL'
);

// ============================================================
// Warning Checks (推奨)
// ============================================================
console.log('\n【Warning Checks】\n');

checkWarning(
  'OpenAI API Key',
  process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-'),
  'OPENAI_API_KEY が設定されていません。AI機能が利用できません。\n  取得: https://platform.openai.com/account/api-keys'
);

checkWarning(
  'Email Configuration',
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD,
  'メール送信が設定されていません。通知機能が利用できません。'
);

checkWarning(
  'Stripe Webhook Secret',
  process.env.STRIPE_WEBHOOK_SECRET,
  'Stripe Webhook Secret が設定されていません。Webhook処理が失敗する可能性があります。\n  取得: https://dashboard.stripe.com/webhooks'
);

checkWarning(
  'Node Environment',
  process.env.NODE_ENV === 'production',
  'NODE_ENV が production に設定されていません。\n  設定: NODE_ENV=production'
);

// ============================================================
// Info Checks
// ============================================================
console.log('\n【Info Checks】\n');

if (process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
  console.log('ℹ️  Stripe TEST MODE が有効です（テスト環境用）');
}

if (process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_')) {
  console.log('ℹ️  Stripe LIVE MODE が有効です（本番環境用）');
}

if (process.env.NODE_ENV === 'production') {
  console.log('ℹ️  本番環境として設定されています');
}

// ============================================================
// Results
// ============================================================
console.log('\n' + '='.repeat(60));
console.log('【RESULTS】\n');

if (checks.critical.length > 0) {
  console.log('Critical Issues:');
  checks.critical.forEach(c => console.log(`  ${c}`));
  console.log();
}

if (checks.warnings.length > 0) {
  console.log('Warnings:');
  checks.warnings.forEach(w => console.log(`  ${w}`));
  console.log();
}

console.log('Info:');
checks.info.forEach(i => console.log(`  ${i}`));

// ============================================================
// Final Verdict
// ============================================================
console.log('\n' + '='.repeat(60));

if (checks.critical.length === 0) {
  console.log('\n✅ 本番公開準備完了\n');
  console.log('すべての必須項目が設定されています。');
  console.log('本番環境へのデプロイを開始できます。\n');
  process.exit(0);
} else {
  console.log('\n❌ 本番公開準備不完了\n');
  console.log(`${checks.critical.length}個の重要な問題があります。`);
  console.log('上記の項目を修正してから本番環境へデプロイしてください。\n');
  process.exit(1);
}
