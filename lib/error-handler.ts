import { supabase } from './supabase';

// カスタムエラークラス
export class ApiError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export class DataQualityError extends Error {
  constructor(message: string, public dataSource?: string) {
    super(message);
    this.name = 'DataQualityError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string, public timeoutDuration?: number) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class ErrorHandler {
  static async handleApiError(error: any, sessionId: string): Promise<void> {
    await supabase
      .from('progress_tracking')
      .insert({
        session_id: sessionId,
        agent_name: 'error_handler',
        status: 'error',
        message: `API Error: ${error.message}`,
        progress_percentage: 0
      });
  }

  static async handleDataQualityError(error: any, sessionId: string): Promise<void> {
    await supabase
      .from('progress_tracking')
      .insert({
        session_id: sessionId,
        agent_name: 'error_handler',
        status: 'error',
        message: `Data Quality Error: ${error.message}`,
        progress_percentage: 0
      });
  }

  static async handleTimeoutError(error: any, sessionId: string): Promise<void> {
    await supabase
      .from('sessions')
      .update({ status: 'error' })
      .eq('id', sessionId);
  }

  static async logErrorMetrics(error: Error, sessionId: string): Promise<void> {
    console.error('Error occurred:', error);
    // 必要に応じて外部ログサービスに送信
  }

  static formatErrorResponse(error: Error): any {
    if (error instanceof ApiError) {
      return {
        error: true,
        code: error.name,
        message: error.message,
        details: error.details
      };
    }
    
    if (error instanceof DataQualityError) {
      return {
        error: true,
        code: 'DATA_QUALITY_ERROR',
        message: error.message,
        quality: error.quality
      };
    }
    
    if (error instanceof TimeoutError) {
      return {
        error: true,
        code: 'TIMEOUT_ERROR',
        message: error.message,
        operation: error.operation
      };
    }
    
    // デフォルトのエラーレスポンス
    return {
      error: true,
      code: 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred'
    };
  }
}