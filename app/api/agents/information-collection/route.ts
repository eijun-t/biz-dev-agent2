// 情報収集エージェントのAPIエンドポイント
import { NextRequest, NextResponse } from 'next/server'
import { InformationCollectionAgent } from '@/lib/agents/information-collection-agent'
import { ErrorHandler } from '@/lib/error-handler'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    // リクエストボディの取得
    const body = await request.json()
    const { sessionId, userId, userInput } = body

    // 必須パラメータのチェック
    if (!sessionId) {
      return NextResponse.json(
        {
          error: true,
          code: 'MISSING_SESSION_ID',
          message: 'Session ID is required'
        },
        { status: 400 }
      )
    }

    // セッションの検証
    const supabase = createServerClient()
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        {
          error: true,
          code: 'INVALID_SESSION',
          message: 'Invalid session ID'
        },
        { status: 404 }
      )
    }

    // エージェントの実行
    const agent = new InformationCollectionAgent({
      sessionId,
      userId,
      userInput: userInput || session.user_input
    })

    const result = await agent.run()

    // 結果の返却
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data
      })
    } else {
      return NextResponse.json(
        {
          error: true,
          code: 'AGENT_EXECUTION_FAILED',
          message: result.error,
          details: result.errorDetails
        },
        { status: 500 }
      )
    }
  } catch (error) {
    // エラーハンドリング
    const errorResponse = ErrorHandler.formatErrorResponse(error as Error)
    
    return NextResponse.json(
      errorResponse,
      { status: 500 }
    )
  }
}

// OPTIONS メソッドのサポート（CORS対応）
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
}