import { NextRequest, NextResponse } from 'next/server';
import { IdeationAgentSimple } from '@/lib/agents/ideation-agent-simple';
import { SessionContext, MarketData } from '@/types/memory';

export async function POST(request: NextRequest) {
  console.log('[Ideation Simple Route] Request received at:', new Date().toISOString());
  
  try {
    const body = await request.json();
    const { sessionId, marketData } = body;
    
    console.log('[Ideation Simple Route] Session ID:', sessionId);
    
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
    
    // シンプルなアイディエーションエージェントの実行
    console.log('[Ideation Simple Route] Creating agent...');
    const ideationAgent = new IdeationAgentSimple();
    
    console.log('[Ideation Simple Route] Generating idea...');
    const businessIdeas = await ideationAgent.generate(marketData, context);
    
    console.log('[Ideation Simple Route] Success! Generated ideas:', businessIdeas.length);
    
    return NextResponse.json({
      success: true,
      ideas: businessIdeas,
      count: businessIdeas.length
    });
    
  } catch (error) {
    console.error('[Ideation Simple Route] Error:', error);
    
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
    service: 'Ideation Agent (Simple)',
    status: 'active',
    description: 'シンプルなビジネスアイデア生成エージェント（テスト用）',
    endpoints: {
      POST: {
        description: '市場データに基づいてビジネスアイデアを1つ生成',
        required: ['sessionId', 'marketData'],
        returns: ['ideas', 'count']
      }
    }
  });
}