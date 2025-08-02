// エラーハンドリングシステム
// エラー隠蔽を禁止し、明確なエラー表示を実現

import { createClient } from '@/lib/supabase'

// カスタムエラークラス
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export class DataQualityError extends Error {
  constructor(
    message: string,
    public qualityScore: number,
    public details?: any
  ) {
    super(message)
    this.name = 'DataQualityError'
  }
}

export class TimeoutError extends Error {
  constructor(
    message: string,
    public timeout: number,
    public operation: string
  ) {
    super(message)
    this.name = 'TimeoutError'
  }
}

// エラーハンドラークラス
export class ErrorHandler {
  static async logError(
    error: Error,
    context: {
      sessionId?: string
      agentName?: string
      operation?: string
      additionalInfo?: any
    }
  ) {
    console.error(`[${context.agentName || 'System'}] Error:`, {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...context
    })

    // Supabaseにエラーログを保存（オプション）
    if (context.sessionId) {
      try {
        const supabase = createClient()
        await supabase.from('progress_tracking').insert({
          session_id: context.sessionId,
          agent_name: context.agentName || 'System',
          status: 'error',
          message: `Error: ${error.message}`,
          progress_percentage: 0
        })
      } catch (logError) {
        console.error('Failed to log error to Supabase:', logError)
      }
    }
  }

  static formatErrorResponse(error: Error): {
    error: boolean
    code: string
    message: string
    details?: any
  } {
    if (error instanceof ApiError) {
      return {
        error: true,
        code: error.code,
        message: error.message,
        details: error.details
      }
    }

    if (error instanceof DataQualityError) {
      return {
        error: true,
        code: 'DATA_QUALITY_ERROR',
        message: error.message,
        details: {
          qualityScore: error.qualityScore,
          ...error.details
        }
      }
    }

    if (error instanceof TimeoutError) {
      return {
        error: true,
        code: 'TIMEOUT_ERROR',
        message: error.message,
        details: {
          timeout: error.timeout,
          operation: error.operation
        }
      }
    }

    // 一般的なエラー
    return {
      error: true,
      code: 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred'
    }
  }

  // 指数バックオフによる再試行
  static async retry<T>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number
      initialDelay?: number
      maxDelay?: number
      factor?: number
      onRetry?: (error: Error, attempt: number) => void
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 10000,
      factor = 2,
      onRetry
    } = options

    let lastError: Error
    let delay = initialDelay

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error
        
        if (attempt === maxRetries) {
          throw lastError
        }

        if (onRetry) {
          onRetry(lastError, attempt)
        }

        await new Promise(resolve => setTimeout(resolve, delay))
        delay = Math.min(delay * factor, maxDelay)
      }
    }

    throw lastError!
  }

  // タイムアウト処理
  static async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operation: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new TimeoutError(
            `Operation '${operation}' timed out after ${timeoutMs}ms`,
            timeoutMs,
            operation
          )),
          timeoutMs
        )
      )
    ])
  }
}