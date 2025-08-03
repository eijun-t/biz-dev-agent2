// SERPER APIクライアント
import { ApiError, DataQualityError } from './error-handler'

export interface SerperSearchResult {
  title: string
  link: string
  snippet: string
  date?: string
  source?: string
}

export interface SerperResponse {
  searchParameters: {
    q: string
    type: string
    engine: string
  }
  organic: SerperSearchResult[]
  knowledgeGraph?: any
  answerBox?: any
}

// SERPER API呼び出し
export async function searchWithSerper(
  query: string,
  options: {
    num?: number
    gl?: string // 国コード（例: 'jp'）
    hl?: string // 言語コード（例: 'ja'）
    type?: 'search' | 'news' | 'images'
    tbs?: string // 時間範囲（例: 'qdr:m' = 過去1ヶ月）
  } = {}
): Promise<SerperResponse> {
  const {
    num = 10,
    gl = 'jp',
    hl = 'ja',
    type = 'search',
    tbs
  } = options

  const apiKey = process.env.SERPER_API_KEY
  
  if (!apiKey) {
    throw new ApiError(
      'SERPER_API_KEY is not configured',
      'MISSING_API_KEY',
      500
    )
  }

  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: query,
        num,
        gl,
        hl,
        type,
        ...(tbs && { tbs })
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new ApiError(
        `SERPER API error: ${response.statusText}`,
        'SERPER_API_ERROR',
        response.status,
        { errorText }
      )
    }

    const data = await response.json()
    
    // データ品質チェック
    if (!data.organic || data.organic.length === 0) {
      throw new DataQualityError(
        `No search results found for query: ${query}`,
        0,
        { query, options }
      )
    }

    return data as SerperResponse
  } catch (error) {
    if (error instanceof ApiError || error instanceof DataQualityError) {
      throw error
    }

    throw new ApiError(
      `Failed to search with SERPER: ${(error as Error).message}`,
      'SERPER_REQUEST_FAILED',
      500,
      { originalError: (error as Error).message }
    )
  }
}

// 複数のクエリを並列検索
export async function searchMultipleQueries(
  queries: string[],
  options: Parameters<typeof searchWithSerper>[1] = {}
): Promise<Map<string, SerperResponse>> {
  const results = new Map<string, SerperResponse>()
  
  // 並列実行（最大5件ずつ）
  const batchSize = 5
  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize)
    const batchPromises = batch.map(async (query) => {
      try {
        const result = await searchWithSerper(query, options)
        return { query, result }
      } catch (error) {
        console.error(`Search failed for query "${query}":`, error)
        return { query, result: null }
      }
    })
    
    const batchResults = await Promise.all(batchPromises)
    
    for (const { query, result } of batchResults) {
      if (result) {
        results.set(query, result)
      }
    }
  }
  
  return results
}

// 検索結果の品質評価
export function evaluateSearchQuality(results: SerperSearchResult[]): {
  score: number
  issues: string[]
} {
  const issues: string[] = []
  let score = 1.0

  // 結果数チェック
  if (results.length < 3) {
    issues.push('検索結果が3件未満です')
    score -= 0.3
  }

  // スニペットの品質チェック
  const avgSnippetLength = results.reduce((sum, r) => sum + (r.snippet?.length || 0), 0) / results.length
  if (avgSnippetLength < 50) {
    issues.push('検索結果の説明文が短すぎます')
    score -= 0.2
  }

  // 日付情報の有無
  const withDate = results.filter(r => r.date).length
  if (withDate < results.length * 0.5) {
    issues.push('日付情報が不足しています')
    score -= 0.1
  }

  // ソースの多様性
  const uniqueSources = new Set(results.map(r => new URL(r.link).hostname)).size
  if (uniqueSources < results.length * 0.5) {
    issues.push('情報源の多様性が不足しています')
    score -= 0.2
  }

  return {
    score: Math.max(0, score),
    issues
  }
}

// マーケットサイズ情報の抽出（簡易版）
export function extractMarketSize(text: string): {
  value?: number
  unit?: string
  year?: number
} {
  // 金額パターンのマッチング（例: 1000億円、$50 billion）
  const patterns = [
    /(\d+(?:\.\d+)?)\s*兆\s*円/,
    /(\d+(?:\.\d+)?)\s*億\s*円/,
    /(\d+(?:\.\d+)?)\s*百万\s*円/,
    /\$\s*(\d+(?:\.\d+)?)\s*billion/i,
    /\$\s*(\d+(?:\.\d+)?)\s*million/i
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const value = parseFloat(match[1])
      const unit = match[0].includes('兆') ? '兆円' :
                   match[0].includes('億') ? '億円' :
                   match[0].includes('百万') ? '百万円' :
                   match[0].toLowerCase().includes('billion') ? 'billion USD' :
                   'million USD'
      
      // 年度の抽出
      const yearMatch = text.match(/20\d{2}/)
      const year = yearMatch ? parseInt(yearMatch[0]) : undefined

      return { value, unit, year }
    }
  }

  return {}
}