/**
 * LIFT. START - Production Ready Server
 * 
 * 本番環境対応版
 * - PostgreSQL統合
 * - OpenAI API実装
 * - Stripe完全実装
 * - 本番環境チェック
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
import Stripe from 'stripe';
import pkg from 'pg';
import {
  initializeDatabase,
  createUser,
  getUserByEmail,
  getUserById,
  updateUserPlan,
  createDiagnosis,
  incrementDiagnosisCount,
  createSubscription,
  recordPayment,
  recordAnalyticsEvent,
  getStatistics,
  getAllUsers,
  saveGoogleIntegration,
  getGoogleIntegration,
  deleteGoogleIntegration,
  checkGooglePublishedPost,
  recordGooglePublishedPost
} from './db.js';

const { Pool } = pkg;

// ============================================================
// Environment Setup
// ============================================================

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_KEY = process.env.ADMIN_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// ============================================================
// Validation
// ============================================================

function validateEnvironment() {
  const errors = [];

  if (NODE_ENV === 'production') {
    if (!DATABASE_URL) errors.push('DATABASE_URL is required in production');
    if (!JWT_SECRET || JWT_SECRET === 'dev-secret-key-change-in-production') {
      errors.push('JWT_SECRET must be set to a strong value in production');
    }
    if (!ADMIN_KEY || ADMIN_KEY === 'dev-admin-key') {
      errors.push('ADMIN_KEY must be set to a strong value in production');
    }
  }

  if (errors.length > 0) {
    console.error('❌ Environment validation failed:');
    errors.forEach(err => console.error(`  - ${err}`));
    if (NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

validateEnvironment();

// Database Setup is fully delegated to db.js

// ============================================================
// Stripe Setup
// ============================================================

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

if (!stripe) {
  console.warn('⚠️ Stripe not configured. Payment functionality disabled.');
}

// ============================================================
// Middleware
// ============================================================

app.use(cors());

// Stripe Webhook must be registered before express.json() to preserve raw Buffer body
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    if (!stripe || !STRIPE_WEBHOOK_SECRET) {
      return res.status(500).json({ error: 'Stripe webhook not configured' });
    }

    const sig = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      STRIPE_WEBHOOK_SECRET
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata.userId;
      const plan = session.metadata.plan;

      const user = await getUserById(userId);
      if (user) {
        await updateUserPlan(userId, plan);
        await createSubscription(userId, plan, session.id, session.subscription);
        recordAnalyticsEvent('payment_success', userId, { plan });
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));



// ============================================================
// Helper Functions
// ============================================================

function generateToken(userId) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  if (!JWT_SECRET) {
    return null;
  }
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.userId = decoded.userId;
  next();
}

function trackConversion(event, userId = null, data = {}) {
  recordAnalyticsEvent(event, userId, data).catch(err => console.error('Analytics tracking error:', err));
}

// ============================================================
// AI Analysis
// ============================================================

async function generateAIAnalysis(shopName, industry, issues) {
  // Check if OpenAI API is configured
  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not configured');
    return {
      error: 'AI API is not configured',
      message: 'Please set OPENAI_API_KEY environment variable',
      aiUsed: false
    };
  }

  try {
    const prompt = `
    あなたはSNS集客のプロです。以下の情報から、${shopName}（${industry}）の集客課題と改善案を分析してください。

    店舗情報：
    - 店舗名: ${shopName}
    - 業種: ${industry}
    - 現在の課題: ${issues}

    以下のJSON形式で回答してください：
    {
      "issues": ["課題1", "課題2", "課題3", "課題4"],
      "improvements": [
        {"priority": "高", "point": "改善ポイント1"},
        {"priority": "高", "point": "改善ポイント2"},
        {"priority": "中", "point": "改善ポイント3"}
      ],
      "opportunities": ["機会1", "機会2", "機会3"],
      "expectedResults": {
        "followers": {"current": 850, "after3months": 1200, "improvement": "+42%"},
        "engagement": {"current": "2.1%", "after3months": "3.5%", "improvement": "+67%"},
        "newCustomers": {"current": 4, "after3months": 10, "improvement": "+150%"}
      }
    }
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
        const errJson = JSON.parse(errorText);
        console.error(`🔍 OpenAI API Diagnostic -> status: ${response.status}, code: ${errJson.error?.code}, type: ${errJson.error?.type}, message: ${errJson.error?.message}`);
      } catch (e) {
        console.error(`🔍 OpenAI API Diagnostic -> status: ${response.status}, rawText: ${errorText}`);
      }
      return {
        error: 'AI API error',
        message: `AIサービスへの接続に失敗しました（ステータス: ${response.status}）。管理者設定を確認してください。`,
        aiUsed: false
      };
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Could not parse JSON from OpenAI response');
      return {
        error: 'AI response parsing error',
        aiUsed: false
      };
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return {
      ...analysis,
      aiUsed: true,
      source: 'openai'
    };
  } catch (error) {
    console.error('❌ AI analysis error:', error);
    return {
      error: 'AI analysis failed',
      message: error.message,
      aiUsed: false
    };
  }
}

// ============================================================
// API Routes
// ============================================================

// 1. Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: NODE_ENV,
    database: process.env.DATABASE_URL ? 'PostgreSQL' : 'Memory',
    openai: OPENAI_API_KEY ? 'Configured' : 'Not configured',
    stripe: stripe ? 'Configured' : 'Not configured'
  });
});

// 2. User Registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, shopName, industry, websiteUrl } = req.body;

    if (!email || !password || !shopName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'このメールアドレスは既に登録されています' });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    const newUser = await createUser(email, hashedPassword, shopName, industry || '美容室', websiteUrl || '');
    
    trackConversion('signup', newUser.id);

    const token = generateToken(newUser.id);

    res.json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        shopName: newUser.shop_name || shopName,
        plan: newUser.plan || 'free'
      }
    });
  } catch (error) {
    console.error('❌ Registration error detail:', error);
    res.status(500).json({ error: 'Registration failed: ' + error.message });
  }
});

// 3. User Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcryptjs.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id);
    trackConversion('login', user.id);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        shopName: user.shop_name,
        plan: user.plan
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// 4. AI Diagnosis
app.post('/api/diagnosis', authMiddleware, async (req, res) => {
  try {
    const user = await getUserById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { shopName, industry, issues } = req.body;

    trackConversion('diagnosis_start', req.userId);

    const diagnosisCount = user.diagnosis_count !== undefined ? user.diagnosis_count : user.diagnosisCount;
    const diagnosisLimit = user.diagnosis_limit !== undefined ? user.diagnosis_limit : user.diagnosisLimit;

    if (diagnosisCount >= diagnosisLimit && user.plan === 'free') {
      return res.status(403).json({
        error: 'Diagnosis limit reached',
        message: 'Free plan allows 1 diagnosis. Please upgrade to continue.'
      });
    }

    const analysis = await generateAIAnalysis(shopName || user.shop_name, industry || user.industry, issues);

    if (analysis.error) {
      return res.status(500).json(analysis);
    }

    const diagnosisRecord = await createDiagnosis(
      req.userId,
      shopName || user.shop_name,
      industry || user.industry,
      issues ? [issues] : [],
      analysis,
      analysis.aiUsed || false
    );

    await incrementDiagnosisCount(req.userId);

    trackConversion('diagnosis_complete', req.userId);

    res.json({
      id: diagnosisRecord.id,
      userId: req.userId,
      shopName: diagnosisRecord.shop_name,
      industry: diagnosisRecord.industry,
      issues: diagnosisRecord.issues,
      improvements: diagnosisRecord.improvements,
      opportunities: diagnosisRecord.opportunities,
      expectedResults: diagnosisRecord.expected_results,
      aiUsed: diagnosisRecord.ai_used,
      createdAt: diagnosisRecord.created_at
    });
  } catch (error) {
    console.error('Diagnosis error:', error);
    res.status(500).json({ error: 'Failed to generate diagnosis' });
  }
});

// 5. Get User Info
app.get('/api/user', authMiddleware, async (req, res) => {
  try {
    const user = await getUserById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      shopName: user.shop_name,
      plan: user.plan,
      diagnosisCount: user.diagnosis_count !== undefined ? user.diagnosis_count : user.diagnosisCount,
      diagnosisLimit: user.diagnosis_limit !== undefined ? user.diagnosis_limit : user.diagnosisLimit
    });
  } catch (error) {
    console.error('User retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve user' });
  }
});

// 6. Stripe Checkout
app.post('/api/checkout', authMiddleware, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    const { plan } = req.body;
    const user = await getUserById(req.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const priceIds = {
      starter: process.env.STRIPE_PRICE_ID_STARTER || 'price_1Pz5ZaKxxxxxxxxxxx',
      pro: process.env.STRIPE_PRICE_ID_PRO || 'price_1Pz5ZbKxxxxxxxxxxx'
    };

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      line_items: [
        {
          price: priceIds[plan],
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'https://lift-start.onrender.com'}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'https://lift-start.onrender.com'}/pricing`,
      metadata: {
        userId: user.id,
        plan: plan
      }
    });

    recordAnalyticsEvent('checkout_start', user.id, { plan });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout error:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to create checkout session', details: error.message });
  }
});



// ============================================================
// Google Business Profile Integration (Official API & Neon DB Persistence)
// ============================================================

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'https://lift-start.onrender.com/api/google/callback';

// Helper: Refresh Google Access Token if expired or expiring soon
async function ensureValidGoogleToken(integration) {
  const now = new Date();
  const expiresAt = new Date(integration.expires_at);
  if (expiresAt > new Date(now.getTime() + 5 * 60 * 1000)) {
    return integration.access_token; // Valid
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !integration.refresh_token) {
    throw new Error('Google OAuth credentials not configured or missing refresh token');
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: integration.refresh_token,
      grant_type: 'refresh_token'
    })
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(`Failed to refresh Google token: ${tokenData.error_description || tokenData.error || 'unknown'}`);
  }

  const newAccessToken = tokenData.access_token;
  const newExpiresIn = tokenData.expires_in || 3600;
  const newExpiresAt = new Date(Date.now() + newExpiresIn * 1000);

  await saveGoogleIntegration(
    integration.user_id,
    newAccessToken,
    tokenData.refresh_token || integration.refresh_token,
    newExpiresAt,
    integration.account_id,
    integration.location_id,
    integration.shop_name
  );

  return newAccessToken;
}

// 1. Get Google connection status
app.get('/api/google/status', authMiddleware, async (req, res) => {
  try {
    const integration = await getGoogleIntegration(req.userId);
    if (!integration) {
      return res.json({ connected: false, shopName: null, locationId: null, lastStatus: '未接続' });
    }
    res.json({
      connected: true,
      shopName: integration.shop_name || 'Google Business Location',
      locationId: integration.location_id,
      lastStatus: '接続済み（公式API連動）'
    });
  } catch (error) {
    console.error('Google status error:', error);
    res.status(500).json({ error: 'Failed to get Google status' });
  }
});

// Temporary store for state -> userId mapping during OAuth flow
const oauthStateMap = new Map();

// 2. Initiate Google OAuth redirect URL with secure state containing userId
app.get('/api/google/auth-url', authMiddleware, (req, res) => {
  try {
    if (!GOOGLE_CLIENT_ID) {
      return res.status(400).json({ error: 'GOOGLE_CLIENT_ID is not configured in Render environment variables.' });
    }
    const state = Math.random().toString(36).substring(2) + Date.now().toString(36);
    oauthStateMap.set(state, req.userId);
    // Cleanup state after 10 mins
    setTimeout(() => oauthStateMap.delete(state), 10 * 60 * 1000);

    const scope = encodeURIComponent('https://www.googleapis.com/auth/business.manage');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}`;
    res.json({ authUrl });
  } catch (error) {
    console.error('Auth URL error:', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

// 3. Google OAuth Callback (Exchange code for tokens, fetch real accounts/locations via official endpoints, save to Neon DB)
app.get('/api/google/callback', async (req, res) => {
  try {
    const { code, state, error: oauthError } = req.query;
    if (oauthError || !code || !state || !oauthStateMap.has(state)) {
      return res.redirect('/?google_error=' + encodeURIComponent(oauthError || 'Invalid authorization code or state'));
    }

    const userId = oauthStateMap.get(state);
    oauthStateMap.delete(state);

    // Exchange code for tokens (Never expose refresh token to browser)
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return res.redirect('/?google_error=' + encodeURIComponent(tokenData.error_description || 'Token exchange failed'));
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token; 
    const expiresIn = tokenData.expires_in || 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Official Google Business Profile Account Management API
    const accountsRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const accountsData = await accountsRes.json();
    const account = accountsData.accounts && accountsData.accounts[0];
    const accountId = account ? account.name : null; // e.g., accounts/12345

    if (!accountId) {
      return res.redirect('/?google_error=' + encodeURIComponent('No Google Business Profile account found for this user'));
    }

    // Official Business Information API for locations
    let locationId = null;
    let shopName = 'Google Business Location';
    const locRes = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountId}/locations`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const locData = await locRes.json();
    const location = locData.locations && locData.locations[0];
    if (location) {
      locationId = location.name; // e.g., accounts/123/locations/456
      shopName = location.title || 'Google Business Location';
    } else {
      return res.redirect('/?google_error=' + encodeURIComponent('No locations found under this Google account'));
    }

    // Fetch existing integration to retain refresh_token if Google did not re-issue one
    const existingIntegration = await getGoogleIntegration(userId);
    const finalRefreshToken = refreshToken || (existingIntegration ? existingIntegration.refresh_token : null);

    if (!finalRefreshToken) {
      return res.redirect('/?google_error=' + encodeURIComponent('Missing refresh token. Please re-authenticate with prompt=consent'));
    }

    // Save securely in Neon PostgreSQL
    await saveGoogleIntegration(
      userId,
      accessToken,
      finalRefreshToken,
      expiresAt,
      accountId,
      locationId,
      shopName
    );

    res.redirect('/?google_connected=success');
  } catch (error) {
    console.error('Google callback error:', error);
    res.redirect('/?google_error=' + encodeURIComponent(error.message));
  }
});

// 4. Manual Connect (Fallback for testing or direct credential save)
app.post('/api/google/connect', authMiddleware, async (req, res) => {
  try {
    const { shopName, locationId, accessToken, refreshToken } = req.body;
    const expiresAt = new Date(Date.now() + 3600 * 1000);

    await saveGoogleIntegration(
      req.userId,
      accessToken || 'mock_access_token',
      refreshToken || 'mock_refresh_token',
      expiresAt,
      'accounts/mock_account',
      locationId || 'accounts/mock_account/locations/mock_location',
      shopName || 'Google Business Location'
    );

    res.json({ success: true, message: 'Google Business Profile connected successfully' });
  } catch (error) {
    console.error('Google connect error:', error);
    res.status(500).json({ error: 'Failed to connect Google account' });
  }
});

// 5. Disconnect Google
app.post('/api/google/disconnect', authMiddleware, async (req, res) => {
  try {
    await deleteGoogleIntegration(req.userId);
    res.json({ success: true, message: 'Google Business Profile disconnected' });
  } catch (error) {
    console.error('Google disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect Google account' });
  }
});

// 6. Publish Local Post to Google Business Profile API (Official Endpoints & Duplicate Prevention)
app.post('/api/google/publish', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const integration = await getGoogleIntegration(userId);
    if (!integration) {
      return res.status(400).json({ error: 'Google Business Profile is not connected' });
    }

    const { content, contentId } = req.body;
    if (!content || !contentId) {
      return res.status(400).json({ error: 'Content and contentId are required' });
    }

    // Check Neon DB for duplicate posting
    const existingPost = await checkGooglePublishedPost(userId, integration.location_id, contentId);
    if (existingPost) {
      return res.status(400).json({ error: 'このコンテンツは既にGoogle Business Profileへ公開済みです（二重投稿防止）' });
    }

    // Ensure valid access token
    const accessToken = await ensureValidGoogleToken(integration);

    // Official Google Business Profile Local Posts API
    // POST https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/localPosts
    const postEndpoint = `https://mybusiness.googleapis.com/v4/${integration.location_id}/localPosts`;
    const payload = {
      languageCode: 'ja',
      summary: content,
      topicType: 'STANDARD',
      callToAction: {
        actionType: 'LEARN_MORE',
        url: process.env.FRONTEND_URL || 'https://lift-start.onrender.com'
      }
    };

    const gbpRes = await fetch(postEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const gbpData = await gbpRes.json();

    if (!gbpRes.ok) {
      const errMessage = gbpData.error?.message || JSON.stringify(gbpData);
      console.error('Google API Error:', gbpRes.status, errMessage);
      return res.status(gbpRes.status).json({
        error: `Google API Error (${gbpRes.status}): ${errMessage}`,
        details: gbpData
      });
    }

    const postResourceName = gbpData.name;
    if (!postResourceName) {
      return res.status(502).json({ error: 'Google API did not return a valid post resource name' });
    }

    // Post-creation verification using official GET endpoint: GET https://mybusiness.googleapis.com/v4/{postResourceName}
    const verifyEndpoint = `https://mybusiness.googleapis.com/v4/${postResourceName}`;
    const verifyRes = await fetch(verifyEndpoint, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!verifyRes.ok) {
      const verifyData = await verifyRes.json().catch(() => ({}));
      console.error('Google post verification failed:', verifyRes.status, verifyData);
      return res.status(502).json({ error: 'Google post verification failed via GET API: ' + (verifyData.error?.message || verifyRes.status) });
    }

    // Record in Neon PostgreSQL for persistent duplicate prevention
    await recordGooglePublishedPost(userId, integration.location_id, contentId, postResourceName);

    res.json({
      success: true,
      message: 'Google Business Profileへ公式API経由で正常に自動公開されました',
      postResourceName,
      publishedAt: new Date().toISOString(),
      locationId: integration.location_id
    });
  } catch (error) {
    console.error('Google publish execution error:', error);
    res.status(500).json({ error: 'Google API publishing failed: ' + error.message });
  }
});

// 8. Admin Stats
app.get('/api/admin/stats', async (req, res) => {
  try {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== ADMIN_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const stats = await getStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve stats' });
  }
});

// ============================================================
// Server Startup
// ============================================================

async function startServer() {
  try {
    // Initialize database
    initializeDatabase();

    // Start listening
    app.listen(PORT, () => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🚀 LIFT. START running on http://localhost:${PORT}`);
      console.log(`${'='.repeat(60)}`);
      console.log(`Environment: ${NODE_ENV}`);
      console.log(`Database: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'Memory (development only)'}`);
      console.log(`OpenAI: ${OPENAI_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
      console.log(`Stripe: ${stripe ? '✅ Configured' : '❌ Not configured'}`);
      console.log(`${'='.repeat(60)}\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  if (pool) {
    await pool.end();
  }
  process.exit(0);
});

// ============================================================
// Buffer Social Media Automation (Instagram, X, Threads) & Daily Scheduler
// ============================================================

const BUFFER_ACCESS_TOKEN = process.env.BUFFER_ACCESS_TOKEN;

async function fetchBufferChannels() {
  if (!BUFFER_ACCESS_TOKEN) return [];
  try {
    const res = await fetch('https://api.bufferapp.com/1/profiles.json?access_token=' + BUFFER_ACCESS_TOKEN);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.profiles || []);
  } catch (err) {
    console.error('Buffer fetch channels error:', err);
    return [];
  }
}

async function publishToBuffer(text, profileIds = []) {
  if (!BUFFER_ACCESS_TOKEN || profileIds.length === 0) return { success: false, error: 'Token or profiles missing' };
  try {
    const res = await fetch('https://api.bufferapp.com/1/updates/create.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        access_token: BUFFER_ACCESS_TOKEN,
        text: text,
        'profile_ids[]': profileIds,
        now: 'true'
      })
    });
    const data = await res.json();
    return { success: res.ok, data };
  } catch (err) {
    console.error('Buffer publish error:', err);
    return { success: false, error: err.message };
  }
}

async function runDailySocialAutomation() {
  console.log('🤖 Running daily social automation for LIFT. START...');
  if (!BUFFER_ACCESS_TOKEN || !OPENAI_API_KEY) {
    console.warn('⚠️ Buffer or OpenAI not fully configured for daily automation.');
    return;
  }

  try {
    const channels = await fetchBufferChannels();
    if (channels.length === 0) {
      console.warn('⚠️ No Buffer channels found.');
      return;
    }
    const profileIds = channels.map(c => c.id);

    // Generate post via OpenAI
    const prompt = '美容サロン・エステ・整体のオーナー向けに、LIFT. START（月額4,980円からのAI集客・自動化ツール、無料AI診断 https://lift-start.onrender.com ）を紹介する集客投稿文を1つ作成してください。CTAのURLを必ず含めてください。';
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 300
      })
    });

    if (!res.ok) {
      console.error('OpenAI generation failed in scheduler');
      return;
    }

    const aiData = await res.json();
    const postText = aiData.choices[0].message.content;

    const pubResult = await publishToBuffer(postText, profileIds);
    console.log('📊 Daily social automation result:', pubResult);
  } catch (err) {
    console.error('Daily social automation error:', err);
  }
}

// Schedule daily execution (every 24 hours, and run once after startup for verification)
setInterval(runDailySocialAutomation, 24 * 60 * 60 * 1000);
// Initial run 10 seconds after boot
setTimeout(runDailySocialAutomation, 10 * 1000);

// External Cron Webhook Endpoint
app.all('/api/automation/daily-post', async (req, res) => {
  try {
    console.log('🔔 /api/automation/daily-post triggered by external cron');
    await runDailySocialAutomation();
    res.json({ success: true, message: 'Daily social automation triggered successfully' });
  } catch (err) {
    console.error('Daily automation endpoint error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
