// ベースエージェントクラス（information-collection-agent用）
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export interface AgentContext {
  sessionId: string;
  userId?: string;
  userInput?: string;
}

export interface AgentResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errorDetails?: any;
}

export abstract class BaseAgent {
  protected name: string;
  protected context: AgentContext;
  protected supabase: ReturnType<typeof createClient<Database>>;

  constructor(name: string, context: AgentContext) {
    this.name = name;
    this.context = context;
    this.supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false
      }
    });
  }

  // エージェントの実行
  async run(): Promise<AgentResult> {
    try {
      await this.updateProgress(0, 'エージェント開始');
      const result = await this.execute();
      await this.updateProgress(100, '完了');
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updateProgress(0, `エラー: ${errorMessage}`, 'error');
      
      return {
        success: false,
        error: errorMessage,
        errorDetails: error
      };
    }
  }

  // 具体的な実行ロジック（サブクラスで実装）
  protected abstract execute(): Promise<any>;

  // 進捗の更新
  protected async updateProgress(
    percentage: number,
    message: string,
    status: 'in_progress' | 'completed' | 'error' = 'in_progress'
  ): Promise<void> {
    try {
      await this.supabase
        .from('progress_tracking')
        .insert({
          session_id: this.context.sessionId,
          agent_name: this.name,
          status,
          progress_percentage: percentage,
          message
        });
    } catch (error) {
      console.error('Progress update failed:', error);
    }
  }

  // API呼び出しのラッパー
  protected async callApi<T>(
    apiCall: () => Promise<T>,
    options: { operation: string }
  ): Promise<T> {
    try {
      return await apiCall();
    } catch (error) {
      console.error(`${options.operation} failed:`, error);
      throw error;
    }
  }

  // バッチ処理
  protected async processBatch<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    options: {
      batchSize: number;
      onProgress?: (processed: number, total: number) => void;
    }
  ): Promise<R[]> {
    const results: R[] = [];
    const { batchSize, onProgress } = options;

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(processor));
      results.push(...batchResults);

      if (onProgress) {
        onProgress(Math.min(i + batchSize, items.length), items.length);
      }
    }

    return results;
  }
}