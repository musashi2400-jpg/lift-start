/**
 * LIFT. START - AI Analysis Module
 * OpenAI API統合
 */

import fetch from 'node-fetch';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = 'gpt-3.5-turbo';

/**
 * AI APIが設定されているか確認
 */
export function isAIConfigured() {
  return !!OPENAI_API_KEY && OPENAI_API_KEY.startsWith('sk-');
}

/**
 * AI分析を実行
 */
export async function generateAIAnalysis(shopName, industry, issues) {
  if (!isAIConfigured()) {
    console.warn('⚠️ OPENAI_API_KEY が設定されていません。モック回答を使用します。');
    return {
      aiUsed: false,
      source: 'mock',
      ...generateMockAnalysis(industry)
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
        model: OPENAI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      console.error(`OpenAI API error: ${response.status}`);
      return {
        aiUsed: false,
        source: 'mock_error',
        ...generateMockAnalysis(industry)
      };
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // JSONを抽出
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Could not parse JSON from OpenAI response');
      return {
        aiUsed: false,
        source: 'mock_parse_error',
        ...generateMockAnalysis(industry)
      };
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return {
      aiUsed: true,
      source: 'openai',
      ...analysis
    };
  } catch (error) {
    console.error('AI analysis error:', error);
    return {
      aiUsed: false,
      source: 'mock_exception',
      ...generateMockAnalysis(industry)
    };
  }
}

/**
 * モック分析を生成（AI API未設定時）
 */
function generateMockAnalysis(industry) {
  const analyses = {
    beauty: {
      issues: [
        '投稿頻度が低い（月4回、競合平均6.3回）',
        'エンゲージメント率が低い（2.1%、競合平均2.5%）',
        'ビフォーアフター投稿が少ない（25%、競合平均35%）',
        'ヘアケア情報が不足している（10%、競合平均20%）'
      ],
      improvements: [
        { priority: '高', point: '投稿頻度を月4回から月8回に増やす' },
        { priority: '高', point: 'ビフォーアフター投稿の割合を25%から40%に増やす' },
        { priority: '中', point: 'ヘアケア情報の投稿を10%から25%に増やす' }
      ],
      opportunities: [
        'トレンドカラーに対応した投稿を増やす',
        'ヘアケア関連の投稿を強化する',
        'シーズンごとのスタイル提案を追加'
      ],
      expectedResults: {
        followers: { current: 850, after3months: 1200, improvement: '+42%' },
        engagement: { current: '2.1%', after3months: '3.5%', improvement: '+67%' },
        newCustomers: { current: 4, after3months: 10, improvement: '+150%' }
      }
    },
    nail: {
      issues: [
        '投稿の視認性が低い（デザイン画像の質）',
        'トレンドネイルの情報発信が不足',
        'ビフォーアフター投稿が少ない'
      ],
      improvements: [
        { priority: '高', point: 'ネイルデザイン画像の質を向上させる' },
        { priority: '高', point: 'トレンドネイルの投稿を週2回以上' },
        { priority: '中', point: 'カラー別・テーマ別の投稿を体系化' }
      ],
      opportunities: [
        'シーズナルデザインの提案',
        'カップルネイル・親子ネイルの提案',
        'セルフネイルのコツ投稿'
      ],
      expectedResults: {
        followers: { current: 650, after3months: 950, improvement: '+46%' },
        engagement: { current: '1.8%', after3months: '3.2%', improvement: '+78%' },
        newCustomers: { current: 3, after3months: 8, improvement: '+167%' }
      }
    },
    massage: {
      issues: [
        '施術効果の説明が不足',
        'ビフォーアフター情報の発信が少ない',
        '予約の取りやすさがPRされていない'
      ],
      improvements: [
        { priority: '高', point: '施術効果を数値化して発信' },
        { priority: '高', point: '顧客の改善事例を投稿' },
        { priority: '中', point: '予約システムの簡単さをPR' }
      ],
      opportunities: [
        'セルフケア方法の投稿',
        '季節ごとの体のお悩み対策',
        'リピーター向けのキャンペーン'
      ],
      expectedResults: {
        followers: { current: 500, after3months: 800, improvement: '+60%' },
        engagement: { current: '2.3%', after3months: '4.1%', improvement: '+78%' },
        newCustomers: { current: 5, after3months: 12, improvement: '+140%' }
      }
    },
    esthetic: {
      issues: [
        'ビフォーアフター画像の不足',
        'コース説明が複雑',
        'キャンペーン情報の発信が少ない'
      ],
      improvements: [
        { priority: '高', point: 'ビフォーアフター画像を月2回以上投稿' },
        { priority: '高', point: 'コース説明を簡潔に' },
        { priority: '中', point: 'キャンペーン情報を週1回投稿' }
      ],
      opportunities: [
        'スキンケアのコツ投稿',
        '季節ごとの肌ケア提案',
        'メンズエステの提案'
      ],
      expectedResults: {
        followers: { current: 720, after3months: 1100, improvement: '+53%' },
        engagement: { current: '2.0%', after3months: '3.8%', improvement: '+90%' },
        newCustomers: { current: 4, after3months: 11, improvement: '+175%' }
      }
    },
    gym: {
      issues: [
        'ビフォーアフター画像が少ない',
        'トレーニング方法の説明不足',
        'メンバーの成功事例の発信が少ない'
      ],
      improvements: [
        { priority: '高', point: 'ビフォーアフター画像を月2回以上投稿' },
        { priority: '高', point: 'トレーニング動画を週1回投稿' },
        { priority: '中', point: 'メンバーの成功事例を月1回投稿' }
      ],
      opportunities: [
        'ホームトレーニング動画',
        '栄養情報の発信',
        'グループレッスンの紹介'
      ],
      expectedResults: {
        followers: { current: 1200, after3months: 1800, improvement: '+50%' },
        engagement: { current: '2.5%', after3months: '4.2%', improvement: '+68%' },
        newCustomers: { current: 6, after3months: 15, improvement: '+150%' }
      }
    }
  };

  return analyses[industry] || analyses.beauty;
}

/**
 * AI使用状況を取得
 */
export function getAIStatus() {
  return {
    configured: isAIConfigured(),
    model: OPENAI_MODEL,
    message: isAIConfigured()
      ? '✅ OpenAI API が設定されています'
      : '⚠️ OpenAI API が設定されていません。モック回答を使用しています。'
  };
}
