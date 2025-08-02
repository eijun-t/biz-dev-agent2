// 情報収集エージェント
import { BaseAgent, AgentContext } from './base-agent'
import { callOpenAI, callOpenAIForJSON } from '@/lib/openai-client'
import { searchWithSerper, searchMultipleQueries, evaluateSearchQuality, extractMarketSize } from '@/lib/serper-client'
import { TREND_CATEGORIES, TrendCategory } from '@/lib/constants/categories'
import { Database } from '@/types/database'

type ResearchData = Database['public']['Tables']['research_data']['Insert']
type CapabilityData = Database['public']['Tables']['capabilities']['Row']

interface CategoryTrend {
  category: TrendCategory
  trends: Array<{
    title: string
    description: string
    marketSize?: {
      value?: number
      unit?: string
      year?: number
    }
    source: string
    reliability: number
  }>
  summary: string
}

interface CapabilityAffinity {
  capabilityId: string
  capabilityName: string
  affinityScore: number
  synergySenario: string
  accelerationPotential: string
}

export class InformationCollectionAgent extends BaseAgent {
  constructor(context: AgentContext) {
    super('Information Collection Agent', context)
  }

  protected async execute(): Promise<{
    userAnalysis: any
    categoryTrends: CategoryTrend[]
    capabilityAffinities: CapabilityAffinity[]
    researchDataIds: string[]
  }> {
    // 1. ユーザー入力の解析と調査計画策定
    await this.updateProgress(10, 'ユーザー入力を解析中...')
    const userAnalysis = await this.analyzeUserInput()

    // 2. デフォルト12カテゴリのトレンド収集
    await this.updateProgress(20, '各カテゴリのトレンドを収集中...')
    const categoryTrends = await this.collectCategoryTrends()

    // 3. ケイパビリティ親和性評価
    await this.updateProgress(80, 'ケイパビリティとの親和性を評価中...')
    const capabilityAffinities = await this.evaluateCapabilityAffinities(
      userAnalysis,
      categoryTrends
    )

    // 4. 収集データの保存
    await this.updateProgress(90, 'データを保存中...')
    const researchDataIds = await this.saveResearchData(
      userAnalysis,
      categoryTrends,
      capabilityAffinities
    )

    return {
      userAnalysis,
      categoryTrends,
      capabilityAffinities,
      researchDataIds
    }
  }

  // ユーザー入力の解析
  private async analyzeUserInput(): Promise<any> {
    const prompt = `
あなたは事業分析の専門家です。以下のユーザー入力を分析し、事業機会の調査計画を策定してください。

ユーザー入力: "${this.context.userInput || '特定の事業領域の指定なし'}"

以下の形式でJSONを返してください：
{
  "businessDomain": "特定された事業領域",
  "keywords": ["関連キーワード1", "関連キーワード2", ...],
  "targetMarket": "想定ターゲット市場",
  "researchFocus": ["調査重点項目1", "調査重点項目2", ...],
  "potentialOpportunities": ["機会1", "機会2", ...],
  "searchQueries": ["検索クエリ1", "検索クエリ2", ...]
}
`

    return await this.callApi(
      () => callOpenAIForJSON([
        { role: 'system', content: 'You are a business analysis expert. Always respond in Japanese.' },
        { role: 'user', content: prompt }
      ]),
      { operation: 'User input analysis' }
    )
  }

  // カテゴリ別トレンド収集
  private async collectCategoryTrends(): Promise<CategoryTrend[]> {
    const trends: CategoryTrend[] = []

    // カテゴリを並列処理
    const results = await this.processBatch(
      TREND_CATEGORIES,
      async (category) => await this.collectSingleCategoryTrend(category),
      {
        batchSize: 3, // 同時実行数を制限
        onProgress: (processed, total) => {
          const progress = 20 + Math.round((processed / total) * 50)
          this.updateProgress(progress, `トレンド収集中: ${processed}/${total} カテゴリ`)
        }
      }
    )

    return results
  }

  // 単一カテゴリのトレンド収集
  private async collectSingleCategoryTrend(category: TrendCategory): Promise<CategoryTrend> {
    try {
      // 検索クエリの生成
      const searchQueries = [
        `${category.name} 最新トレンド 2024`,
        `${category.name} 市場規模 成長率`,
        ...category.keywords.slice(0, 2).map(kw => `${kw} 事業機会`)
      ]

      // 検索実行
      const searchResults = await searchMultipleQueries(searchQueries, {
        num: 5,
        tbs: 'qdr:y' // 過去1年
      })

      // トレンド情報の抽出
      const trends: CategoryTrend['trends'] = []
      
      for (const [query, result] of searchResults) {
        if (result && result.organic) {
          for (const item of result.organic.slice(0, 3)) {
            const marketSize = extractMarketSize(item.snippet)
            const quality = evaluateSearchQuality([item])
            
            trends.push({
              title: item.title,
              description: item.snippet,
              marketSize: marketSize.value ? marketSize : undefined,
              source: item.link,
              reliability: quality.score
            })
          }
        }
      }

      // AIによる要約
      const summaryPrompt = `
以下の${category.name}分野のトレンド情報を要約し、ビジネス機会を特定してください：

${trends.map(t => `- ${t.title}: ${t.description}`).join('\n')}

200文字以内で要約してください。
`

      const summary = await this.callApi(
        () => callOpenAI([
          { role: 'user', content: summaryPrompt }
        ], { maxTokens: 500 }),
        { operation: `Summarize ${category.name} trends` }
      )

      return {
        category,
        trends,
        summary
      }
    } catch (error) {
      console.error(`Failed to collect trends for ${category.name}:`, error)
      
      // エラーが発生してもデフォルト値を返す（エラー隠蔽禁止）
      return {
        category,
        trends: [],
        summary: `${category.name}のトレンド収集中にエラーが発生しました: ${(error as Error).message}`
      }
    }
  }

  // ケイパビリティ親和性評価
  private async evaluateCapabilityAffinities(
    userAnalysis: any,
    categoryTrends: CategoryTrend[]
  ): Promise<CapabilityAffinity[]> {
    // ケイパビリティデータの取得
    const capabilities = await this.dbOperation(
      () => this.supabase.from('capabilities').select('*'),
      'Failed to fetch capabilities'
    )

    const affinities: CapabilityAffinity[] = []

    // 各ケイパビリティとの親和性を評価
    for (const capability of capabilities) {
      const affinity = await this.evaluateSingleCapabilityAffinity(
        capability,
        userAnalysis,
        categoryTrends
      )
      affinities.push(affinity)
    }

    // スコア順にソート
    return affinities.sort((a, b) => b.affinityScore - a.affinityScore)
  }

  // 単一ケイパビリティの親和性評価
  private async evaluateSingleCapabilityAffinity(
    capability: CapabilityData,
    userAnalysis: any,
    categoryTrends: CategoryTrend[]
  ): Promise<CapabilityAffinity> {
    const prompt = `
以下のケイパビリティと事業機会の親和性を評価してください：

ケイパビリティ: ${capability.capability_name}
説明: ${capability.description}
強み: ${JSON.stringify(capability.specific_skills)}

事業領域: ${userAnalysis.businessDomain}
ターゲット市場: ${userAnalysis.targetMarket}

関連トレンド:
${categoryTrends.slice(0, 3).map(t => `- ${t.category.name}: ${t.summary}`).join('\n')}

評価基準：
- このケイパビリティを活用することで事業が大幅にアクセラレートできるか
- 具体的なシナジー効果が見込めるか
- 競争優位性を確立できるか

以下の形式でJSONを返してください：
{
  "affinityScore": 0.0〜1.0の数値,
  "synergySenario": "具体的なシナジーシナリオ（100文字以内）",
  "accelerationPotential": "事業加速の可能性（100文字以内）"
}
`

    const result = await this.callApi(
      () => callOpenAIForJSON<{
        affinityScore: number
        synergySenario: string
        accelerationPotential: string
      }>([
        { role: 'system', content: 'You are a business strategy expert. Always respond in Japanese.' },
        { role: 'user', content: prompt }
      ]),
      { operation: `Evaluate ${capability.capability_name} affinity` }
    )

    return {
      capabilityId: capability.id,
      capabilityName: capability.capability_name,
      ...result
    }
  }

  // 研究データの保存
  private async saveResearchData(
    userAnalysis: any,
    categoryTrends: CategoryTrend[],
    capabilityAffinities: CapabilityAffinity[]
  ): Promise<string[]> {
    const dataToSave: ResearchData[] = []

    // ユーザー分析結果の保存
    dataToSave.push({
      session_id: this.context.sessionId,
      category: 'general',
      data_type: 'user_analysis',
      title: 'ユーザー入力分析',
      content: userAnalysis,
      reliability_score: 1.0
    })

    // カテゴリトレンドの保存
    for (const trend of categoryTrends) {
      if (trend.trends.length > 0) {
        dataToSave.push({
          session_id: this.context.sessionId,
          category: 'market_trend',
          subcategory: trend.category.id,
          data_type: 'trend',
          title: `${trend.category.name}のトレンド`,
          content: {
            trends: trend.trends,
            summary: trend.summary
          },
          reliability_score: trend.trends.reduce((sum, t) => sum + t.reliability, 0) / trend.trends.length
        })
      }
    }

    // ケイパビリティ親和性の保存
    dataToSave.push({
      session_id: this.context.sessionId,
      category: 'capability_affinity',
      data_type: 'analysis',
      title: 'ケイパビリティ親和性評価',
      content: capabilityAffinities,
      reliability_score: 0.9
    })

    // バッチ挿入
    const { data, error } = await this.supabase
      .from('research_data')
      .insert(dataToSave)
      .select('id')

    if (error) {
      console.error('Failed to save research data:', error)
      return []
    }

    return data?.map(d => d.id) || []
  }
}