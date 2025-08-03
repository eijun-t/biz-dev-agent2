#!/usr/bin/env tsx
// Research Agent → Ideation Agent の連携テスト

import { config } from 'dotenv'
import path from 'path'

// 環境変数の読み込み
config({ path: path.resolve(__dirname, '../.env.local') })

const API_URL = 'http://localhost:3005/api'

interface MarketData {
  trends: Array<{
    category: string
    trend_name: string
    description: string
    market_size: number
    growth_rate: number
    relevance_score: number
  }>
  technologies: Array<{
    technology_name: string
    description: string
    maturity_level: string
    adoption_rate: number
    impact_potential: number
  }>
  regulations: Array<{
    regulation_name: string
    description: string
    impact_level: string
    compliance_difficulty: number
    implementation_timeline: string
  }>
  opportunities: Array<{
    opportunity_name: string
    description: string
    target_market: string
    estimated_market_size: number
    competitive_landscape: string
  }>
}

async function createSession() {
  console.log('📝 セッションを作成中...')
  
  const response = await fetch(`${API_URL}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_input: 'スマートシティとIoT技術を活用した新規事業'
      // user_idは省略（NULLになる）
    })
  })

  if (!response.ok) {
    throw new Error(`Failed to create session: ${response.statusText}`)
  }

  const data = await response.json()
  console.log('✅ セッション作成成功:', data.sessionId)
  return data.sessionId
}

async function runResearchAgent(sessionId: string) {
  console.log('\n🔍 Research Agent実行中...')
  
  const response = await fetch(`${API_URL}/agents/information-collection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Research Agent failed: ${JSON.stringify(error, null, 2)}`)
  }

  const result = await response.json()
  console.log('✅ Research Agent完了')
  console.log('📊 収集されたデータ:')
  console.log(`  - カテゴリトレンド数: ${result.data.categoryTrends?.length || 0}`)
  console.log(`  - 保存されたデータID数: ${result.data.researchDataIds?.length || 0}`)
  
  return result.data
}

async function convertToMarketData(researchData: any): Promise<MarketData> {
  console.log('\n🔄 MarketData形式に変換中...')
  
  const marketData: MarketData = {
    trends: [],
    technologies: [],
    regulations: [],
    opportunities: []
  }

  // カテゴリトレンドからMarketDataのtrendsを生成
  if (researchData.categoryTrends) {
    for (const categoryTrend of researchData.categoryTrends) {
      if (categoryTrend.trends && categoryTrend.trends.length > 0) {
        // カテゴリ全体のトレンドとして1つ追加
        const avgMarketSize = categoryTrend.trends
          .map((t: any) => t.marketSize?.value || 0)
          .reduce((a: number, b: number) => a + b, 0) / categoryTrend.trends.length

        marketData.trends.push({
          category: categoryTrend.category.name,
          trend_name: categoryTrend.category.name + 'トレンド',
          description: categoryTrend.summary || categoryTrend.trends[0].description,
          market_size: Math.max(avgMarketSize || 1000, 1000), // 最低1000億円
          growth_rate: 20, // デフォルト成長率
          relevance_score: categoryTrend.relevanceScore || 0.7
        })

        // ビジネス機会があれば追加
        if (categoryTrend.businessOpportunity) {
          marketData.opportunities.push({
            opportunity_name: categoryTrend.category.name + '関連事業',
            description: categoryTrend.businessOpportunity,
            target_market: '大手企業',
            estimated_market_size: Math.max(avgMarketSize || 1500, 1500),
            competitive_landscape: '競合増加中'
          })
        }
      }
    }
  }

  // テクノロジー情報を追加（サンプル）
  marketData.technologies.push({
    technology_name: 'IoTセンサー',
    description: '環境データのリアルタイム収集',
    maturity_level: 'growth',
    adoption_rate: 40,
    impact_potential: 8
  })

  console.log('✅ 変換完了:')
  console.log(`  - トレンド数: ${marketData.trends.length}`)
  console.log(`  - 機会数: ${marketData.opportunities.length}`)
  
  return marketData
}

async function runIdeationAgent(sessionId: string, marketData: MarketData) {
  console.log('\n💡 Ideation Agent V2実行中...')
  
  const response = await fetch(`${API_URL}/agents/ideation-v2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, marketData })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Ideation Agent failed: ${JSON.stringify(error, null, 2)}`)
  }

  const result = await response.json()
  console.log('✅ Ideation Agent完了')
  
  // レスポンスの構造を確認
  console.log('\n📊 Ideationレスポンス構造:')
  console.log(JSON.stringify(Object.keys(result), null, 2))
  
  const ideas = result.businessIdeas || result.ideas || result.data?.businessIdeas || []
  console.log(`📋 生成されたアイデア数: ${ideas.length}`)
  console.log(`📋 カウント: ${result.count || 'N/A'}`)
  
  if (ideas.length > 0) {
    console.log('\n生成されたビジネスアイデア:')
    ideas.forEach((idea: any, index: number) => {
      console.log(`\n${index + 1}. ${idea.title}`)
      console.log(`   説明: ${idea.description}`)
      console.log(`   市場規模: ${idea.market_size}億円`)
      console.log(`   目標利益: ${idea.projected_profit}億円`)
      console.log(`   活用ケイパビリティ: ${idea.capability_categories?.join(', ') || 'N/A'}`)
    })
  }
  
  return result
}

async function main() {
  try {
    console.log('🚀 Research → Ideation 連携テスト開始\n')
    
    // 1. セッション作成
    const sessionId = await createSession()
    
    // 2. Research Agent実行
    const researchData = await runResearchAgent(sessionId)
    
    // 3. データ形式変換
    const marketData = await convertToMarketData(researchData)
    
    // 4. Ideation Agent実行
    const ideationResult = await runIdeationAgent(sessionId, marketData)
    
    console.log('\n✨ 連携テスト完了!')
    console.log('セッションID:', sessionId)
    
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error)
    process.exit(1)
  }
}

// 実行
main()