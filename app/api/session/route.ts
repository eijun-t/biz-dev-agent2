import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { debugLogger } from '@/lib/debug-logger'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const { user_input, user_id } = body
    
    // デバッグ: リクエストログ
    await debugLogger.logApiCall('new-session', 'Session Creation', 'request', body)

    if (!user_input) {
      return NextResponse.json(
        { error: 'User input is required' },
        { status: 400 }
      )
    }

    // Service Role Keyを使用してSupabaseクライアントを作成
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false
      }
    })

    // 新しいセッションを作成
    const { data: session, error } = await supabase
      .from('sessions')
      .insert({
        user_id: user_id || null,
        user_input,
        status: 'in_progress'
      })
      .select()
      .single()

    if (error) {
      console.error('Session creation error:', error)
      
      // デバッグ: エラーログ
      await debugLogger.logError('new-session', 'Session Creation', error)
      
      return NextResponse.json(
        { error: 'Failed to create session', details: error.message },
        { status: 500 }
      )
    }

    const response = {
      success: true,
      sessionId: session.id,
      session
    }
    
    // デバッグ: レスポンスログ
    await debugLogger.logApiCall(session.id, 'Session Creation', 'response', response, startTime)
    
    // セッションディレクトリの初期化
    await debugLogger.initSession(session.id)
    
    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Session API error:', error)
    
    // デバッグ: エラーログ
    await debugLogger.logError('new-session', 'Session Creation', error)
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// セッション情報の取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false
      }
    })

    const { data: session, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (error || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      session
    })
  } catch (error: any) {
    console.error('Session GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}