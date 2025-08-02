// BaseAgentクラス - 全てのエージェントの基底クラス
// エラー隠蔽禁止の原則を実装

import { createServerClient } from '@/lib/supabase-server'
import { ErrorHandler, ApiError, TimeoutError } from '@/lib/error-handler'
import { Database } from '@/types/database'

export interface AgentContext {
  sessionId: string
  userId?: string
  userInput?: string
}

export interface AgentResult<T = any> {
  success: boolean
  data?: T
  error?: string
  errorDetails?: any
}

export abstract class BaseAgent {
  protected supabase = createServerClient()
  protected agentName: string
  protected context: AgentContext

  constructor(agentName: string, context: AgentContext) {
    this.agentName = agentName
    this.context = context
  }

  // 抽象メソッド - 各エージェントで実装
  protected abstract execute(): Promise<any>

  // エージェント実行のラッパー
  async run<T = any>(): Promise<AgentResult<T>> {
    const startTime = Date.now()
    
    try {
      // 進捗報告: 開始
      await this.updateProgress(0, 'Starting...')

      // タイムアウト付きで実行（10分制限）
      const result = await ErrorHandler.withTimeout(
        this.execute(),
        10 * 60 * 1000, // 10分
        this.agentName
      )

      // 進捗報告: 完了
      await this.updateProgress(100, 'Completed')

      return {
        success: true,
        data: result
      }
    } catch (error) {
      // エラーハンドリング - エラー隠蔽禁止
      await ErrorHandler.logError(error as Error, {
        sessionId: this.context.sessionId,
        agentName: this.agentName,
        operation: 'execute'
      })

      // 進捗報告: エラー
      await this.updateProgress(
        0,
        `Error: ${(error as Error).message}`,
        'error'
      )

      const errorResponse = ErrorHandler.formatErrorResponse(error as Error)
      
      return {
        success: false,
        error: errorResponse.message,
        errorDetails: errorResponse.details
      }
    } finally {
      const duration = Date.now() - startTime
      console.log(`[${this.agentName}] Execution time: ${duration}ms`)
    }
  }

  // 進捗更新
  protected async updateProgress(
    percentage: number,
    message: string,
    status: string = 'in_progress'
  ): Promise<void> {
    try {
      await this.supabase.from('progress_tracking').insert({
        session_id: this.context.sessionId,
        agent_name: this.agentName,
        progress_percentage: percentage,
        message,
        status
      })
    } catch (error) {
      console.error(`Failed to update progress:`, error)
      // 進捗更新の失敗は処理を止めない
    }
  }

  // API呼び出しの共通処理
  protected async callApi<T>(
    apiCall: () => Promise<T>,
    options: {
      maxRetries?: number
      operation?: string
    } = {}
  ): Promise<T> {
    const { maxRetries = 3, operation = 'API call' } = options

    try {
      return await ErrorHandler.retry(apiCall, {
        maxRetries,
        onRetry: (error, attempt) => {
          console.log(
            `[${this.agentName}] Retrying ${operation} (attempt ${attempt}/${maxRetries}):`,
            error.message
          )
        }
      })
    } catch (error) {
      throw new ApiError(
        `Failed to complete ${operation} after ${maxRetries} attempts`,
        'API_CALL_FAILED',
        500,
        { originalError: (error as Error).message }
      )
    }
  }

  // データベース操作の共通処理
  protected async dbOperation<T>(
    operation: () => Promise<{ data: T | null; error: any }>,
    errorMessage: string
  ): Promise<T> {
    const { data, error } = await operation()
    
    if (error) {
      throw new ApiError(
        errorMessage,
        'DATABASE_ERROR',
        500,
        { dbError: error }
      )
    }

    if (!data) {
      throw new ApiError(
        `${errorMessage}: No data returned`,
        'NO_DATA',
        404
      )
    }

    return data
  }

  // バッチ処理用のヘルパー
  protected async processBatch<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    options: {
      batchSize?: number
      onProgress?: (processed: number, total: number) => void
    } = {}
  ): Promise<R[]> {
    const { batchSize = 5, onProgress } = options
    const results: R[] = []
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(item => processor(item))
      )
      results.push(...batchResults)
      
      if (onProgress) {
        onProgress(results.length, items.length)
      }
      
      // 進捗更新
      const progress = Math.round((results.length / items.length) * 100)
      await this.updateProgress(
        progress,
        `Processing: ${results.length}/${items.length} items`
      )
    }
    
    return results
  }
}