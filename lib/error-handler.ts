import { supabase } from '@/lib/supabase';

// カスタムエラークラス
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class DataQualityError extends Error {
  constructor(
    message: string,
    public dataSource?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'DataQualityError';
  }
}

export class TimeoutError extends Error {
  constructor(
    message: string,
    public timeoutDuration?: number,
    public operation?: string
  ) {
    super(message);
    this.name = 'TimeoutError';
  }
}

// エラーログ型定義
interface ErrorLog {
  session_id?: string;
  error_type: string;
  error_message: string;
  error_details: any;
  error_stack?: string;
  created_at?: string;
}

// エラーハンドラークラス
export class ErrorHandler {
  static async handleApiError(
    error: ApiError,
    sessionId?: string
  ): Promise<void> {
    console.error('API Error:', {
      message: error.message,
      statusCode: error.statusCode,
      code: error.code,
      details: error.details,
    });

    await this.logError({
      session_id: sessionId,
      error_type: 'api_error',
      error_message: error.message,
      error_details: {
        statusCode: error.statusCode,
        code: error.code,
        details: error.details,
      },
      error_stack: error.stack,
    });
  }

  static async handleDataQualityError(
    error: DataQualityError,
    sessionId?: string
  ): Promise<void> {
    console.error('Data Quality Error:', {
      message: error.message,
      dataSource: error.dataSource,
      details: error.details,
    });

    await this.logError({
      session_id: sessionId,
      error_type: 'data_quality_error',
      error_message: error.message,
      error_details: {
        dataSource: error.dataSource,
        details: error.details,
      },
      error_stack: error.stack,
    });
  }

  static async handleTimeoutError(
    error: TimeoutError,
    sessionId?: string
  ): Promise<void> {
    console.error('Timeout Error:', {
      message: error.message,
      timeoutDuration: error.timeoutDuration,
      operation: error.operation,
    });

    await this.logError({
      session_id: sessionId,
      error_type: 'timeout_error',
      error_message: error.message,
      error_details: {
        timeoutDuration: error.timeoutDuration,
        operation: error.operation,
      },
      error_stack: error.stack,
    });
  }

  static async handleError(
    error: Error,
    sessionId?: string
  ): Promise<void> {
    if (error instanceof ApiError) {
      await this.handleApiError(error, sessionId);
    } else if (error instanceof DataQualityError) {
      await this.handleDataQualityError(error, sessionId);
    } else if (error instanceof TimeoutError) {
      await this.handleTimeoutError(error, sessionId);
    } else {
      console.error('Unexpected Error:', error);
      await this.logError({
        session_id: sessionId,
        error_type: 'unexpected_error',
        error_message: error.message,
        error_details: {},
        error_stack: error.stack,
      });
    }
  }

  private static async logError(errorLog: ErrorLog): Promise<void> {
    try {
      // エラーログテーブルがまだ存在しない場合のため、progress_trackingに記録
      if (errorLog.session_id) {
        await supabase.from('progress_tracking').insert({
          session_id: errorLog.session_id,
          agent_name: 'error_handler',
          status: 'error',
          progress_percentage: 0,
          message: `${errorLog.error_type}: ${errorLog.error_message}`,
        });
      }
    } catch (logError) {
      console.error('Failed to log error to Supabase:', logError);
    }
  }

  // 再試行メカニズム（指数バックオフ）
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 2,
    initialDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          console.error(`操作が${maxRetries + 1}回失敗しました:`, error);
          throw error;
        }

        // 指数バックオフ: 1秒、2秒、4秒...
        const delay = initialDelay * Math.pow(2, attempt);
        console.warn(
          `試行 ${attempt + 1}/${maxRetries + 1} が失敗しました。${delay}ms後に再試行します。`,
          error
        );
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  // エラーレスポンスの生成
  static createErrorResponse(error: Error) {
    if (error instanceof ApiError) {
      return {
        success: false,
        error: {
          code: error.code || 'API_ERROR',
          message: error.message,
          details: error.details,
          statusCode: error.statusCode,
        },
      };
    } else if (error instanceof DataQualityError) {
      return {
        success: false,
        error: {
          code: 'DATA_QUALITY_ERROR',
          message: error.message,
          details: {
            dataSource: error.dataSource,
            ...error.details,
          },
        },
      };
    } else if (error instanceof TimeoutError) {
      return {
        success: false,
        error: {
          code: 'TIMEOUT_ERROR',
          message: error.message,
          details: {
            timeoutDuration: error.timeoutDuration,
            operation: error.operation,
          },
        },
      };
    } else {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || '予期しないエラーが発生しました',
          details: {},
        },
      };
    }
  }
}