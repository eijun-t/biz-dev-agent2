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
      prompt,
      systemPrompt,
      temperature,
      maxTokens,
      responseFormat,
      sessionId,
    } = body;

    if (!prompt) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'プロンプトが必要です',
          },
        },
        { status: 400 }
      );
    }

    // OpenAI APIクライアントの初期化
    const openai = new OpenAIClient();

    // テキスト生成
    const response = await openai.generate(prompt, {
      systemPrompt,
      temperature,
      maxTokens,
      responseFormat,
    });

    return NextResponse.json({
      success: true,
      data: {
        content: response.content,
        usage: response.usage,
      },
    });
  } catch (error) {
    console.error('OpenAI generate error:', error);
    const errorResponse = ErrorHandler.createErrorResponse(error as Error);
    
    // ステータスコードの決定
    const statusCode = 
      errorResponse.error.statusCode || 
      (errorResponse.error.code === 'UNAUTHORIZED' ? 401 : 500);

    return NextResponse.json(errorResponse, { status: statusCode });
  }
}