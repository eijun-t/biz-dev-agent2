import { NextRequest, NextResponse } from 'next/server';
import { IdeationAgent } from '@/lib/agents/ideation-agent';
import { SessionContext, MarketData } from '@/types/memory';

export async function POST(request: NextRequest) {
  console.log('[Ideation Route] Request received');
  
  try {
    const body = await request.json();
    const { sessionId, marketData } = body;
    
    console.log('[Ideation Route] Session ID:', sessionId);
    console.log('[Ideation Route] Market data trends count:', marketData?.trends?.length || 0);
    
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
      userInput: null, // この時点では使用しない
      marketData
    };
    
    // アイディエーションエージェントの実行
    console.log('[Ideation Route] Creating agent...');
    const ideationAgent = new IdeationAgent();
    
    console.log('[Ideation Route] Generating ideas...');
    const businessIdeas = await ideationAgent.generate(marketData, context);
    
    console.log('[Ideation Route] Generated ideas count:', businessIdeas.length);
    
    return NextResponse.json({
      success: true,
      ideas: businessIdeas,
      count: businessIdeas.length
    });
    
  } catch (error) {
    console.error('Ideation agent error:', error);
    
    // エラーを隠蔽せず、明確に返す
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
    service: 'Ideation Agent',
    status: 'active',
    description: 'ビジネスアイデア生成エージェント',
    endpoints: {
      POST: {
        description: '市場データに基づいてビジネスアイデアを生成',
        required: ['sessionId', 'marketData'],
        returns: ['ideas', 'count']
      }
    }
  });
}