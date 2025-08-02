import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { InformationCollectionAgent } from '@/lib/agents/information-collection-agent'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const { session_id, user_input } = await request.json()

    if (!session_id) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Service Role Keyを使用してSupabaseクライアントを作成
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false
      }
    })

    // セッションを更新
    const { error: updateError } = await supabase
      .from('sessions')
      .update({ status: 'in_progress' })
      .eq('id', session_id)

    if (updateError) {
      throw updateError
    }

    // 情報収集エージェントAPIを直接呼び出す（同期処理）
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `http://localhost:${process.env.PORT || 3003}`
    const apiUrl = `${baseUrl}/api/agents/information-collection`
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session_id,
          userInput: user_input || ''
        })
      })
      
      if (!response.ok) {
        throw new Error(`Agent API error: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      // 結果をセッションに保存（agent_outputsカラムが存在する場合）
      const updateData: any = {
        status: 'completed'
      }
      
      // agent_outputsカラムが存在する場合のみ設定
      if (result.data) {
        updateData.agent_outputs = {
          information_collection: result.data
        }
      }
      
      await supabase
        .from('sessions')
        .update(updateData)
        .eq('id', session_id)
        
    } catch (error: any) {
      console.error('Agent execution error:', error)
      
      const errorUpdateData: any = {
        status: 'failed'
      }
      
      // error_messageカラムが存在する場合のみ設定
      errorUpdateData.error_message = error.message
      
      await supabase
        .from('sessions')
        .update(errorUpdateData)
        .eq('id', session_id)
        
      throw error
    }

    return NextResponse.json({
      message: 'Workflow started',
      session_id
    })
  } catch (error: any) {
    console.error('Workflow start error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to start workflow' },
      { status: 500 }
    )
  }
}