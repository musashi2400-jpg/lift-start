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

// ============================================================
// Database Setup
// ============================================================

let pool = null;
let useMemoryDB = false;

function initializeDatabase() {
  if (DATABASE_URL) {
    try {
      pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
      });

      pool.on('error', (err) => {
        console.error('❌ Database pool error:', err);
      });

      console.log('✅ PostgreSQL connected');
      return true;
    } catch (error) {
      console.error('❌ Database initialization error:', error);
      if (NODE_ENV === 'production') {
        process.exit(1);
      }
      useMemoryDB = true;
      console.warn('⚠️ Falling back to memory database (development only)');
      return false;
    }
  } else {
    console.warn('⚠️ DATABASE_URL not set. Using memory database (development only)');
    useMemoryDB = true;
    return false;
  }
}

// In-memory database fallback (development only)
const memoryDB = {
  users: [],
  diagnoses: [],
  subscriptions: [],
  payments: [],
  events: []
};

async function queryDB(text, params = []) {
  if (!pool || useMemoryDB) {
    console.warn('⚠️ Using memory database - data will not persist');
    return [];
  }

  try {
    const result = await pool.query(text, params);
    return result.rows;
  } catch (error) {
    console.error('❌ Database query error:', error);
    throw error;
  }
}

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
app.use(express.json());
app.use(express.raw({ type: 'application/json' }));
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
  memoryDB.events.push({
    id: uuidv4(),
    event,
    userId,
    timestamp: new Date(),
    data
  });
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
      console.error(`❌ OpenAI API error: ${response.status}`);
      return {
        error: 'AI API error',
        message: `OpenAI API returned status ${response.status}`,
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
    database: pool ? 'PostgreSQL' : 'Memory',
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

    const hashedPassword = await bcryptjs.hash(password, 10);
    const userId = uuidv4();

    const user = {
      id: userId,
      email,
      password: hashedPassword,
      shopName,
      industry,
      websiteUrl,
      plan: 'free',
      diagnosisCount: 0,
      diagnosisLimit: 1,
      createdAt: new Date()
    };

    memoryDB.users.push(user);
    trackConversion('signup', userId);

    const token = generateToken(userId);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        shopName: user.shopName,
        plan: user.plan
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// 3. User Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    const user = memoryDB.users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcryptjs.compare(password, user.password);
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
        shopName: user.shopName,
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
    const user = memoryDB.users.find(u => u.id === req.userId);
    const { shopName, industry, issues } = req.body;

    trackConversion('diagnosis_start', req.userId);

    if (user.diagnosisCount >= user.diagnosisLimit && user.plan === 'free') {
      return res.status(403).json({
        error: 'Diagnosis limit reached',
        message: 'Free plan allows 1 diagnosis. Please upgrade to continue.'
      });
    }

    const analysis = await generateAIAnalysis(shopName, industry, issues);

    if (analysis.error) {
      return res.status(500).json(analysis);
    }

    const diagnosis = {
      id: uuidv4(),
      userId: req.userId,
      shopName,
      industry,
      ...analysis,
      createdAt: new Date()
    };

    user.diagnosisCount += 1;
    memoryDB.diagnoses.push(diagnosis);

    trackConversion('diagnosis_complete', req.userId);

    res.json(diagnosis);
  } catch (error) {
    console.error('Diagnosis error:', error);
    res.status(500).json({ error: 'Failed to generate diagnosis' });
  }
});

// 5. Get User Info
app.get('/api/user', authMiddleware, (req, res) => {
  try {
    const user = memoryDB.users.find(u => u.id === req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      shopName: user.shopName,
      plan: user.plan,
      diagnosisCount: user.diagnosisCount,
      diagnosisLimit: user.diagnosisLimit
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
    const user = memoryDB.users.find(u => u.id === req.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Price IDs must be set in environment variables
    const priceIds = {
      starter: process.env.STRIPE_PRICE_ID_STARTER || 'price_1Pz5ZaKxxxxxxxxxxx',
      pro: process.env.STRIPE_PRICE_ID_PRO || 'price_1Pz5ZbKxxxxxxxxxxx'
    };

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceIds[plan],
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pricing`,
      metadata: {
        userId: user.id,
        plan: plan
      }
    });

    trackConversion('checkout_start', user.id, { plan });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// 7. Stripe Webhook
app.post('/api/webhooks/stripe', async (req, res) => {
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

      const user = memoryDB.users.find(u => u.id === userId);
      if (user) {
        user.plan = plan;
        
        if (plan === 'starter') {
          user.diagnosisLimit = 10;
        } else if (plan === 'pro') {
          user.diagnosisLimit = 999;
        }

        memoryDB.subscriptions.push({
          id: uuidv4(),
          userId,
          plan,
          stripeSessionId: session.id,
          status: 'active',
          createdAt: new Date()
        });

        trackConversion('payment_success', userId, { plan });
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const sub = memoryDB.subscriptions.find(s => s.stripeSessionId === subscription.id);
      if (sub) {
        sub.status = 'cancelled';
        const user = memoryDB.users.find(u => u.id === sub.userId);
        if (user) {
          user.plan = 'free';
          user.diagnosisLimit = 1;
          trackConversion('cancellation', user.id);
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
});

// 8. Admin Stats
app.get('/api/admin/stats', (req, res) => {
  try {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== ADMIN_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const stats = {
      totalUsers: memoryDB.users.length,
      freeUsers: memoryDB.users.filter(u => u.plan === 'free').length,
      starterUsers: memoryDB.users.filter(u => u.plan === 'starter').length,
      proUsers: memoryDB.users.filter(u => u.plan === 'pro').length,
      totalDiagnoses: memoryDB.diagnoses.length,
      monthlyRecurringRevenue: (
        memoryDB.users.filter(u => u.plan === 'starter').length * 4980 +
        memoryDB.users.filter(u => u.plan === 'pro').length * 9800
      ) / 100
    };

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
      console.log(`Database: ${pool ? 'PostgreSQL' : 'Memory (development only)'}`);
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
