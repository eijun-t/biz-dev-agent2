import { ErrorHandler, ApiError, DataQualityError, TimeoutError } from '../error-handler';

export abstract class BaseAgent {
  protected async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    operationName: string,
    sessionId: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      // エラーを隠蔽せず、明確に記録・表示
      await ErrorHandler.logErrorMetrics(error as Error, sessionId);
      
      if (error instanceof ApiError) {
        await ErrorHandler.handleApiError(error, sessionId);
        throw new Error(`${operationName}でAPI エラーが発生しました: ${error.message}`);
      } else if (error instanceof DataQualityError) {
        await ErrorHandler.handleDataQualityError(error, sessionId);
        throw new Error(`${operationName}でデータ品質エラーが発生しました: ${error.message}`);
      } else if (error instanceof TimeoutError) {
        await ErrorHandler.handleTimeoutError(error, sessionId);
        throw new Error(`${operationName}で処理時間超過エラーが発生しました: ${error.message}`);
      } else {
        throw new Error(`${operationName}で予期しないエラーが発生しました: ${(error as Error).message}`);
      }
    }
  }

  protected async updateProgress(
    sessionId: string,
    agentName: string,
    progressPercentage: number,
    message: string,
    status: 'started' | 'in_progress' | 'completed' | 'error' = 'in_progress'
  ): Promise<void> {
    const { supabaseAdmin } = await import('../supabase-admin');
    
    await supabaseAdmin
      .from('progress_tracking')
      .insert({
        session_id: sessionId,
        agent_name: agentName,
        status,
        progress_percentage: progressPercentage,
        message
      });
  }
}