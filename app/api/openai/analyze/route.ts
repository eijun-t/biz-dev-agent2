import { NextRequest, NextResponse } from 'next/server';
import { OpenAIClient } from '@/lib/openai-client';
import { ErrorHandler } from '@/lib/error-handler';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    // 認証チェック（一時的に無効化）
    // TODO: 認証の問題を解決後、有効化する
    // const supabase = createClient();
    // const { data: { user } } = await supabase.auth.getUser();
    // if (!user) {
    //   return NextResponse.json(
    //     {
    //       success: false,
    //       error: {
    //         code: 'UNAUTHORIZED',
    //         message: '認証が必要です',
    //       },
    //     },
    //     { status: 401 }
    //   );
    // }

    // リクエストボディの解析
    const body = await request.json();
    const {
      data,
      analysisPrompt,
      systemPrompt,
      temperature,
      maxTokens,
      sessionId,
    } = body;

    if (!data || !analysisPrompt) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'データと分析プロンプトが必要です',
          },
        },
        { status: 400 }
      );
    }

    // OpenAI APIクライアントの初期化
    const openai = new OpenAIClient();

    // データ分析
    const analysisResult = await openai.analyze(data, analysisPrompt, {
      systemPrompt,
      temperature,
      maxTokens,
    });

    return NextResponse.json({
      success: true,
      data: analysisResult,
    });
  } catch (error) {
    console.error('OpenAI analyze error:', error);
    const errorResponse = ErrorHandler.createErrorResponse(error as Error);
    
    // ステータスコードの決定
    const statusCode = 
      errorResponse.error.statusCode || 
      (errorResponse.error.code === 'UNAUTHORIZED' ? 401 : 500);

    return NextResponse.json(errorResponse, { status: statusCode });
  }
}