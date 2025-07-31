import { ErrorHandler, ApiError, DataQualityError, TimeoutError } from './error-handler';

export interface AgentContext {
  sessionId: string;
  userId?: string;
  [key: string]: any;
}

export abstract class BaseAgent {
  protected context: AgentContext;

  constructor(context: AgentContext) {
    this.context = context;
  }

  /**
   * エラー隠蔽禁止の原則に基づいた実行メソッド
   * エラーが発生した場合は、明確に記録・表示する
   */
  protected async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    try {
      console.log(`[${this.constructor.name}] ${operationName} を開始します`);
      const result = await operation();
      console.log(`[${this.constructor.name}] ${operationName} が正常に完了しました`);
      return result;
    } catch (error) {
      // エラーを隠蔽せず、明確に記録・表示
      const errorMessage = `[${this.constructor.name}] ${operationName}でエラーが発生しました`;
      console.error(errorMessage, error);
      
      await ErrorHandler.handleError(error as Error, this.context.sessionId);
      
      // エラーの詳細情報を含めて再スロー
      if (error instanceof ApiError) {
        throw new ApiError(
          `${errorMessage}: ${error.message}`,
          error.statusCode,
          error.code,
          error.details
        );
      } else if (error instanceof DataQualityError) {
        throw new DataQualityError(
          `${errorMessage}: ${error.message}`,
          error.dataSource,
          error.details
        );
      } else if (error instanceof TimeoutError) {
        throw new TimeoutError(
          `${errorMessage}: ${error.message}`,
          error.timeoutDuration,
          error.operation
        );
      } else {
        throw new Error(`${errorMessage}: ${(error as Error).message}`);
      }
    }
  }

  /**
   * 再試行機能付き実行メソッド
   * 最大2回まで再試行（設定可能）
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = 2
  ): Promise<T> {
    return this.executeWithErrorHandling(
      () => ErrorHandler.withRetry(operation, maxRetries),
      operationName
    );
  }

  /**
   * タイムアウト機能付き実行メソッド
   */
  protected async executeWithTimeout<T>(
    operation: () => Promise<T>,
    operationName: string,
    timeoutMs: number = 30000
  ): Promise<T> {
    return this.executeWithErrorHandling(async () => {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new TimeoutError(
            `操作がタイムアウトしました（${timeoutMs}ms）`,
            timeoutMs,
            operationName
          ));
        }, timeoutMs);
      });

      return Promise.race([operation(), timeoutPromise]);
    }, operationName);
  }

  /**
   * データ品質チェック
   * 必須フィールドの確認や基本的な検証を行う
   */
  protected validateData<T>(
    data: T,
    requiredFields: (keyof T)[],
    dataSource: string
  ): void {
    if (!data) {
      throw new DataQualityError(
        'データが存在しません',
        dataSource,
        { data }
      );
    }

    const missingFields = requiredFields.filter(
      field => data[field] === undefined || data[field] === null
    );

    if (missingFields.length > 0) {
      throw new DataQualityError(
        `必須フィールドが不足しています: ${missingFields.join(', ')}`,
        dataSource,
        { missingFields, data }
      );
    }
  }

  /**
   * 進捗状況の更新
   */
  protected async updateProgress(
    agentName: string,
    status: 'started' | 'in_progress' | 'completed' | 'error',
    progressPercentage: number,
    message: string
  ): Promise<void> {
    try {
      const { supabase } = await import('@/lib/supabase');
      await supabase.from('progress_tracking').insert({
        session_id: this.context.sessionId,
        agent_name: agentName,
        status,
        progress_percentage: progressPercentage,
        message,
      });
    } catch (error) {
      console.error('進捗状況の更新に失敗しました:', error);
      // 進捗更新の失敗は処理を中断しない
    }
  }
}