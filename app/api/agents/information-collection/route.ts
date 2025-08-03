// 情報収集エージェントのAPIエンドポイント
import { NextRequest, NextResponse } from 'next/server'
import { InformationCollectionAgent } from '@/lib/agents/information-collection-agent'
import { ErrorHandler } from '@/lib/error-handler'
import { createServerClient } from '@/lib/supabase-server'
import { debugLogger } from '@/lib/debug-logger'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // リクエストボディの取得
    const body = await request.json()
    const { sessionId, userId, userInput } = body
    
    // デバッグ: リクエストログ
    await debugLogger.logApiCall(sessionId || 'unknown', 'Research Agent', 'request', body)

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
      const response = {
        success: true,
        data: result.data
      }
      
      // デバッグ: レスポンスログ
      await debugLogger.logApiCall(sessionId, 'Research Agent', 'response', response, startTime)
      
      return NextResponse.json(response)
    } else {
      const errorResponse = {
        error: true,
        code: 'AGENT_EXECUTION_FAILED',
        message: result.error,
        details: result.errorDetails
      }
      
      // デバッグ: エラーログ
      await debugLogger.logError(sessionId, 'Research Agent', result.error, result.errorDetails)
      
      return NextResponse.json(errorResponse, { status: 500 })
    }
  } catch (error) {
    // エラーハンドリング
    const errorResponse = ErrorHandler.formatErrorResponse(error as Error)
    
    // デバッグ: エラーログ
    await debugLogger.logError(sessionId || 'unknown', 'Research Agent', error)
    
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