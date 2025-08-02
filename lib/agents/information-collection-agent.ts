// 情報収集エージェント v3 - ケイパビリティ評価を削除、既存データ再利用機能付き
import { BaseAgent, AgentContext } from './base-agent'
import { callOpenAI, callOpenAIForJSON } from '@/lib/openai-client'
import { searchWithSerper, searchMultipleQueries, evaluateSearchQuality, extractMarketSize } from '@/lib/serper-client'
import { TREND_CATEGORIES, TrendCategory } from '@/lib/constants/categories'
import { Database } from '@/types/database'

type ResearchData = Database['public']['Tables']['research_data']['Insert']

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
  relevanceScore?: number
  businessOpportunity?: string
}

export class InformationCollectionAgent extends BaseAgent {
  constructor(context: AgentContext) {
    super('Information Collection Agent', context)
  }

  protected async execute(): Promise<{
    userAnalysis: any
    categoryTrends: CategoryTrend[]
    researchDataIds: string[]
  }> {
    // 1. ユーザー入力解析
    await this.updateProgress(10, 'ユーザー入力を解析中...')
    const userAnalysis = await this.analyzeUserInput()

    // 2. 既存トレンドデータの確認
    await this.updateProgress(15, '既存のトレンドデータを確認中...')
    const existingTrends = await this.checkExistingTrends()
    
    let categoryTrends: CategoryTrend[]
    let useExistingData = false
    
    if (existingTrends && existingTrends.length > 0) {
      // 既存データの利用可否をユーザー入力から判断
      useExistingData = await this.shouldUseExistingData(existingTrends)
      
      if (useExistingData) {
        await this.updateProgress(20, '既存のトレンドデータを使用します...')
        categoryTrends = await this.loadExistingTrends(existingTrends)
      } else {
        await this.updateProgress(20, '最新のトレンドデータを収集中...')
        categoryTrends = await this.collectCategoryTrends()
      }
    } else {
      // 既存データがない場合は新規収集
      await this.updateProgress(20, '各カテゴリのトレンドを収集中...')
      categoryTrends = await this.collectCategoryTrends()
    }

    // 3. データ保存
    await this.updateProgress(90, 'データを保存中...')
    const researchDataIds = await this.saveResearchData(
      userAnalysis,
      categoryTrends,
      useExistingData
    )

    return {
      userAnalysis,
      categoryTrends,
      researchDataIds
    }
  }

  // 既存トレンドデータの確認
  private async checkExistingTrends(): Promise<any[]> {
    // 最新の12カテゴリトレンドデータを確認
    const { data, error } = await this.supabase
      .from('research_data')
      .select('*')
      .eq('category', 'market_trend')
      .eq('data_type', 'trend')
      .in('subcategory', TREND_CATEGORIES.map(c => c.id))
      .order('created_at', { ascending: false })
      .limit(12)
    
    if (error) {
      console.error('既存トレンド確認エラー:', error)
      return []
    }
    
    // 12カテゴリすべてが揃っているか確認
    const uniqueCategories = new Set(data.map(d => d.subcategory))
    if (uniqueCategories.size === 12) {
      return data
    }
    
    return []
  }

  // 既存データを使用するかの判断
  private async shouldUseExistingData(existingTrends: any[]): Promise<boolean> {
    // ユーザー入力に特定のキーワードが含まれているかチェック
    const refreshKeywords = ['最新', '更新', 'リフレッシュ', '再調査', '新しい', 'latest', 'update', 'refresh']
    const userInputLower = this.context.userInput.toLowerCase()
    
    const shouldRefresh = refreshKeywords.some(keyword => 
      userInputLower.includes(keyword.toLowerCase())
    )
    
    if (shouldRefresh) {
      return false // 新規調査を実行
    }
    
    // データの新しさを確認（例：7日以内なら使用可能）
    const oldestData = existingTrends.reduce((oldest, current) => {
      return new Date(current.created_at) < new Date(oldest.created_at) ? current : oldest
    })
    
    const dataAge = Date.now() - new Date(oldestData.created_at).getTime()
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000
    
    return dataAge < sevenDaysInMs
  }

  // 既存トレンドの読み込み
  private async loadExistingTrends(existingData: any[]): Promise<CategoryTrend[]> {
    const trends: CategoryTrend[] = []
    
    for (const data of existingData) {
      const category = TREND_CATEGORIES.find(c => c.id === data.subcategory)
      if (category) {
        trends.push({
          category,
          trends: data.content.trends || [],
          summary: data.content.summary || '',
          relevanceScore: data.content.relevanceScore,
          businessOpportunity: data.content.businessOpportunity
        })
      }
    }
    
    // ユーザー入力との関連性を再評価
    return await this.reevaluateRelevance(trends)
  }

  // 関連性の再評価
  private async reevaluateRelevance(trends: CategoryTrend[]): Promise<CategoryTrend[]> {
    const prompt = `
以下のユーザー入力に対して、各カテゴリの関連性スコアを再評価してください：

ユーザー入力: ${this.context.userInput}

カテゴリ一覧:
${trends.map(t => `- ${t.category.name}: ${t.summary}`).join('\n')}

各カテゴリについて、0.0〜1.0の関連性スコアを返してください。
JSONフォーマット: { "カテゴリ名": スコア }
`

    const scores = await this.callApi(
      () => callOpenAIForJSON<Record<string, number>>([
        { role: 'system', content: 'You are a business analyst expert. Always respond in Japanese.' },
        { role: 'user', content: prompt }
      ]),
      { operation: 'Reevaluate relevance scores' }
    )

    // スコアを更新
    return trends.map(trend => ({
      ...trend,
      relevanceScore: scores[trend.category.name] || trend.relevanceScore || 0.5
    })).sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
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

  // カテゴリ別トレンド収集（v1と同じ実装）
  private async collectCategoryTrends(): Promise<CategoryTrend[]> {
    const results = await this.processBatch(
      TREND_CATEGORIES,
      async (category) => await this.collectSingleCategoryTrend(category),
      {
        batchSize: 3,
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
      const searchQueries = [
        `${category.name} 最新トレンド 2024`,
        `${category.name} 市場規模 成長率`,
        ...category.keywords.slice(0, 2).map(kw => `${kw} 事業機会`)
      ]

      const searchResults = await searchMultipleQueries(searchQueries, {
        num: 5,
        tbs: 'qdr:y'
      })

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

      // ユーザー入力との関連性評価
      const relevancePrompt = `
ユーザー入力: "${this.context.userInput || '特定の事業領域の指定なし'}"
カテゴリ: ${category.name}
トレンド要約: ${summary}

このカテゴリとユーザー入力の関連性を0.0〜1.0のスコアで評価し、具体的なビジネス機会を1文で述べてください。

JSONフォーマット:
{
  "relevanceScore": 0.0〜1.0の数値,
  "businessOpportunity": "具体的なビジネス機会（50文字以内）"
}
`

      const relevanceResult = await this.callApi(
        () => callOpenAIForJSON<{
          relevanceScore: number
          businessOpportunity: string
        }>([
          { role: 'system', content: 'You are a business analyst. Always respond in Japanese.' },
          { role: 'user', content: relevancePrompt }
        ]),
        { operation: `Evaluate ${category.name} relevance` }
      )

      return {
        category,
        trends,
        summary,
        ...relevanceResult
      }
    } catch (error) {
      console.error(`Failed to collect trends for ${category.name}:`, error)
      
      return {
        category,
        trends: [],
        summary: `${category.name}のトレンド収集中にエラーが発生しました: ${(error as Error).message}`
      }
    }
  }

  // 研究データの保存
  private async saveResearchData(
    userAnalysis: any,
    categoryTrends: CategoryTrend[],
    usedExistingData: boolean
  ): Promise<string[]> {
    const dataToSave: ResearchData[] = []

    // ユーザー分析結果の保存
    dataToSave.push({
      session_id: this.context.sessionId,
      category: 'general',
      data_type: 'user_analysis',
      title: 'ユーザー入力分析',
      content: {
        ...userAnalysis,
        usedExistingTrends: usedExistingData,
        analysisDate: new Date().toISOString()
      },
      reliability_score: 1.0
    })

    // 新規収集した場合のみカテゴリトレンドを保存
    if (!usedExistingData) {
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
              summary: trend.summary,
              relevanceScore: trend.relevanceScore,
              businessOpportunity: trend.businessOpportunity
            },
            reliability_score: trend.trends.reduce((sum, t) => sum + t.reliability, 0) / trend.trends.length
          })
        }
      }
    }

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