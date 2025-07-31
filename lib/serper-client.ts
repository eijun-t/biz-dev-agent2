import { ApiError, ErrorHandler, DataQualityError } from './error-handler';

export interface SerperSearchParams {
  query: string;
  num?: number;
  lang?: 'ja' | 'en' | 'all';
  location?: string;
  type?: 'search' | 'news' | 'images';
}

export interface SerperSearchResult {
  title: string;
  link: string;
  snippet: string;
  date?: string;
  source?: string;
}

export interface SerperResponse {
  searchParameters: {
    query: string;
    type: string;
    num: number;
  };
  organic: SerperSearchResult[];
  news?: SerperSearchResult[];
  knowledgeGraph?: any;
  searchTime: number;
}

export class SerperClient {
  private apiKey: string;
  private baseUrl = 'https://google.serper.dev';

  constructor() {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) {
      throw new Error('SERPER_API_KEY is not set in environment variables');
    }
    this.apiKey = apiKey;
  }

  /**
   * Web検索を実行
   */
  async search(params: SerperSearchParams): Promise<SerperResponse> {
    const {
      query,
      num = 10, // デフォルト10件
      lang = 'all', // 日本語・英語両方
      location,
      type = 'search',
    } = params;

    if (!query || query.trim().length === 0) {
      throw new DataQualityError(
        '検索クエリが空です',
        'SerperClient',
        { params }
      );
    }

    // 検索パラメータの構築
    const searchParams: any = {
      q: query,
      num: Math.min(num, 10), // 最大10件に制限
    };

    // 言語設定
    if (lang === 'ja') {
      searchParams.hl = 'ja';
      searchParams.gl = 'jp';
    } else if (lang === 'en') {
      searchParams.hl = 'en';
      searchParams.gl = 'us';
    }

    if (location) {
      searchParams.location = location;
    }

    try {
      const response = await ErrorHandler.withRetry(
        async () => {
          const endpoint = type === 'news' ? '/news' : '/search';
          const res = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
              'X-API-KEY': this.apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(searchParams),
          });

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new ApiError(
              `SERPER API error: ${res.statusText}`,
              res.status,
              errorData.error || 'SERPER_ERROR',
              errorData
            );
          }

          return res.json();
        },
        2, // 最大2回まで再試行
        1000 // 初期遅延1秒
      );

      // レスポンスの品質チェック
      const validatedResponse = this.validateResponse(response, type);
      
      return validatedResponse;
    } catch (error) {
      if (error instanceof ApiError || error instanceof DataQualityError) {
        throw error;
      }
      throw new ApiError(
        `SERPER API request failed: ${(error as Error).message}`,
        500,
        'REQUEST_FAILED',
        error
      );
    }
  }

  /**
   * 検索結果の品質チェック
   */
  private validateResponse(response: any, type: string): SerperResponse {
    if (!response) {
      throw new DataQualityError(
        'SERPER APIからの応答が空です',
        'SerperClient',
        { response }
      );
    }

    // 検索結果の基本構造をチェック
    const results = type === 'news' ? response.news : response.organic;
    
    if (!Array.isArray(results)) {
      throw new DataQualityError(
        '検索結果が配列形式ではありません',
        'SerperClient',
        { response, type }
      );
    }

    if (results.length === 0) {
      console.warn('検索結果が0件です:', response.searchParameters);
    }

    // 各結果の必須フィールドをチェック
    const validatedResults = results.map((result: any, index: number) => {
      if (!result.title || !result.link) {
        console.warn(`検索結果${index + 1}に必須フィールドが不足しています:`, result);
      }
      
      return {
        title: result.title || '',
        link: result.link || '',
        snippet: result.snippet || '',
        date: result.date,
        source: result.source,
      };
    });

    return {
      searchParameters: {
        query: response.searchParameters?.q || '',
        type: response.searchParameters?.type || type,
        num: response.searchParameters?.num || validatedResults.length,
      },
      organic: type === 'search' ? validatedResults : [],
      news: type === 'news' ? validatedResults : undefined,
      knowledgeGraph: response.knowledgeGraph,
      searchTime: response.searchTime || 0,
    };
  }

  /**
   * 複数のクエリで検索を実行（バッチ検索）
   */
  async batchSearch(
    queries: string[],
    params: Omit<SerperSearchParams, 'query'> = {}
  ): Promise<Map<string, SerperResponse>> {
    const results = new Map<string, SerperResponse>();
    
    // 並列実行を制限（同時に3つまで）
    const batchSize = 3;
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      const batchPromises = batch.map(query => 
        this.search({ ...params, query })
          .then(result => ({ query, result }))
          .catch(error => {
            console.error(`検索クエリ「${query}」でエラーが発生しました:`, error);
            return { query, error };
          })
      );
      
      const batchResults = await Promise.all(batchPromises);
      
      for (const { query, result, error } of batchResults) {
        if (result && !error) {
          results.set(query, result);
        }
      }
    }
    
    return results;
  }
}