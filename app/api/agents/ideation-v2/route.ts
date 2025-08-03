import { NextRequest, NextResponse } from 'next/server';
import { IdeationAgentV2 } from '@/lib/agents/ideation-agent-v2';
import { SessionContext } from '@/types/memory';
import { debugLogger } from '@/lib/debug-logger';

export async function POST(request: NextRequest) {
  console.log('[Ideation V2 Route] Request received at:', new Date().toISOString());
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { sessionId, marketData } = body;
    
    // デバッグ: リクエストログ
    await debugLogger.logApiCall(sessionId || 'unknown', 'Ideation Agent V2', 'request', body);
    
    console.log('[Ideation V2 Route] Session ID:', sessionId);
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    if (!marketData) {
      return NextResponse.json(
        { error: 'Market data is required' },
        { status: 400 }
      );
    }
    
    // セッションコンテキストの作成
    const context: SessionContext = {
      sessionId,
      userInput: null,
      marketData
    };
    
    // V2アイディエーションエージェントの実行
    console.log('[Ideation V2 Route] Creating agent...');
    const ideationAgent = new IdeationAgentV2();
    
    console.log('[Ideation V2 Route] Generating ideas with capability scenarios...');
    const businessIdeas = await ideationAgent.generate(marketData, context);
    
    console.log('[Ideation V2 Route] Success! Generated ideas:', businessIdeas.length);
    
    const response = {
      success: true,
      ideas: businessIdeas,
      count: businessIdeas.length
    };
    
    // デバッグ: レスポンスログ
    await debugLogger.logApiCall(sessionId, 'Ideation Agent V2', 'response', response, startTime);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[Ideation V2 Route] Error:', error);
    
    // デバッグ: エラーログ
    await debugLogger.logError(sessionId || 'unknown', 'Ideation Agent V2', error);
    
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
        details: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'Ideation Agent V2',
    status: 'active',
    description: 'ケイパビリティ統合版ビジネスアイデア生成エージェント',
    features: [
      '三菱地所のケイパビリティを統合',
      'アセットとネットワークを含むケイパビリティシナリオ生成',
      '「こういうケイパビリティを活かしてビジネスを加速」というストーリー作成'
    ],
    endpoints: {
      POST: {
        description: '市場データに基づいてケイパビリティ活用シナリオ付きビジネスアイデアを生成',
        required: ['sessionId', 'marketData'],
        returns: ['ideas', 'count']
      }
    }
  });
}