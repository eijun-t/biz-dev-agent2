// デバッグロガー - 環境変数でのデバッグモード制御
import fs from 'fs/promises';
import path from 'path';

const DEBUG_MODE = process.env.DEBUG_MODE === 'true';
const DEBUG_OUTPUT_DIR = path.resolve(process.cwd(), 'debug-output');

export interface DebugLogEntry {
  timestamp: string;
  sessionId: string;
  agent: string;
  phase: 'input' | 'output' | 'error';
  data: any;
  duration?: number;
  metadata?: {
    [key: string]: any;
  };
}

export class DebugLogger {
  private static instance: DebugLogger;
  private sessionDir: string = '';
  private stepCounter: Map<string, number> = new Map();

  private constructor() {}

  static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  // デバッグモードかどうか
  static isDebugMode(): boolean {
    return DEBUG_MODE;
  }

  // セッションディレクトリの初期化
  async initSession(sessionId: string): Promise<void> {
    if (!DEBUG_MODE) return;

    this.sessionDir = path.join(DEBUG_OUTPUT_DIR, `session-${sessionId}`);
    await fs.mkdir(this.sessionDir, { recursive: true });
    
    // セッション開始を記録
    await this.writeMetadata(sessionId, 'session-start', {
      startTime: new Date().toISOString(),
      debugMode: true
    });
  }

  // デバッグログの記録
  async log(entry: DebugLogEntry): Promise<void> {
    if (!DEBUG_MODE) return;

    const { sessionId, agent, phase, data, duration, metadata } = entry;

    // セッションディレクトリが未初期化の場合は初期化
    if (!this.sessionDir) {
      await this.initSession(sessionId);
    }

    // ステップ番号の管理
    const stepKey = `${agent}-${phase}`;
    const currentStep = this.stepCounter.get(stepKey) || 0;
    this.stepCounter.set(stepKey, currentStep + 1);

    // ファイル名の生成
    const stepNumber = this.getGlobalStepNumber();
    const fileName = `${String(stepNumber).padStart(2, '0')}-${agent.toLowerCase().replace(/\s+/g, '-')}-${phase}.json`;
    const filePath = path.join(this.sessionDir, fileName);

    // ログエントリの作成
    const logEntry = {
      timestamp: entry.timestamp,
      sessionId,
      agent,
      phase,
      stepNumber,
      duration,
      metadata,
      data
    };

    // ファイルに書き込み
    await fs.writeFile(filePath, JSON.stringify(logEntry, null, 2));

    // コンソールにも簡易表示（オプション）
    if (process.env.DEBUG_CONSOLE === 'true') {
      this.consoleLog(logEntry);
    }
  }

  // API用のラッパー関数
  async logApiCall(
    sessionId: string,
    agent: string,
    phase: 'request' | 'response' | 'error',
    data: any,
    startTime?: number
  ): Promise<void> {
    if (!DEBUG_MODE) return;

    const duration = startTime ? Date.now() - startTime : undefined;
    
    await this.log({
      timestamp: new Date().toISOString(),
      sessionId,
      agent,
      phase: phase === 'request' ? 'input' : phase === 'response' ? 'output' : 'error',
      data,
      duration
    });
  }

  // エラーログ
  async logError(sessionId: string, agent: string, error: any, context?: any): Promise<void> {
    if (!DEBUG_MODE) return;

    await this.log({
      timestamp: new Date().toISOString(),
      sessionId,
      agent,
      phase: 'error',
      data: {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error,
        context
      }
    });
  }

  // セッション終了
  async endSession(sessionId: string, status: 'completed' | 'failed' | 'partial'): Promise<void> {
    if (!DEBUG_MODE) return;

    await this.writeMetadata(sessionId, 'session-end', {
      endTime: new Date().toISOString(),
      status,
      totalSteps: this.getGlobalStepNumber()
    });

    // フローサマリーの生成
    await this.generateFlowSummary(sessionId);
  }

  // プライベートメソッド
  private getGlobalStepNumber(): number {
    let total = 0;
    for (const count of this.stepCounter.values()) {
      total += count;
    }
    return total;
  }

  private async writeMetadata(sessionId: string, type: string, data: any): Promise<void> {
    const filePath = path.join(this.sessionDir, `${type}.json`);
    await fs.writeFile(filePath, JSON.stringify({
      sessionId,
      type,
      timestamp: new Date().toISOString(),
      ...data
    }, null, 2));
  }

  private async generateFlowSummary(sessionId: string): Promise<void> {
    try {
      const files = await fs.readdir(this.sessionDir);
      const steps: any[] = [];

      // 各ステップファイルを読み込み
      for (const file of files.sort()) {
        if (file.match(/^\d{2}-.*\.json$/) && !file.includes('session-')) {
          const content = await fs.readFile(path.join(this.sessionDir, file), 'utf-8');
          steps.push(JSON.parse(content));
        }
      }

      // サマリーファイルの作成
      const summary = {
        sessionId,
        timestamp: new Date().toISOString(),
        totalSteps: steps.length,
        steps: steps.map(s => ({
          stepNumber: s.stepNumber,
          agent: s.agent,
          phase: s.phase,
          timestamp: s.timestamp,
          duration: s.duration
        }))
      };

      await fs.writeFile(
        path.join(this.sessionDir, 'flow-summary.json'),
        JSON.stringify(summary, null, 2)
      );
    } catch (error) {
      console.error('Failed to generate flow summary:', error);
    }
  }

  private consoleLog(entry: any): void {
    const icon = entry.phase === 'input' ? '📥' : 
                 entry.phase === 'output' ? '📤' : '❌';
    console.log(`${icon} [${entry.agent}] ${entry.phase} - Step ${entry.stepNumber}`);
    if (entry.duration) {
      console.log(`   Duration: ${(entry.duration / 1000).toFixed(2)}s`);
    }
  }
}

// エクスポート用のシングルトンインスタンス
export const debugLogger = DebugLogger.getInstance();