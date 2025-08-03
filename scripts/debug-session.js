// セッションデバッグスクリプト
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// 環境変数の読み込み
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath })
}

const sessionId = process.argv[2]
if (!sessionId) {
  console.log('使用方法: node scripts/debug-session.js <session-id>')
  process.exit(1)
}

async function debugSession() {
  console.log('🔍 セッションデバッグ\n')
  console.log('Session ID:', sessionId)
  console.log('')

  // 1. サービスロールキーでチェック
  console.log('1️⃣ サービスロールキーでの確認:')
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (serviceRoleKey) {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (error) {
      console.log('   ❌ エラー:', error.message)
    } else if (data) {
      console.log('   ✅ セッションが存在します')
      console.log('   作成日時:', new Date(data.created_at).toLocaleString())
      console.log('   ステータス:', data.status)
      console.log('   ユーザーID:', data.user_id || 'なし')
    }
  }

  // 2. ANONキーでチェック
  console.log('\n2️⃣ ANONキーでの確認:')
  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const { data: anonData, error: anonError } = await supabaseAnon
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (anonError) {
    console.log('   ❌ エラー:', anonError.message)
    console.log('   詳細:', anonError.details || 'なし')
    console.log('   → RLSポリシーによりアクセス制限されている可能性があります')
  } else if (anonData) {
    console.log('   ✅ セッションにアクセスできます')
  }

  // 3. APIエンドポイントテスト
  console.log('\n3️⃣ APIエンドポイントテスト:')
  const { API_BASE_URL } = require('./config')
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/agents/information-collection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    })
    
    const result = await response.json()
    console.log('   HTTPステータス:', response.status)
    
    if (result.error) {
      console.log('   エラーコード:', result.code)
      console.log('   メッセージ:', result.message)
    } else {
      console.log('   ✅ APIアクセス成功')
    }
  } catch (error) {
    console.log('   ❌ APIエラー:', error.message)
  }

  console.log('\n💡 解決策:')
  console.log('1. RLSポリシーを一時的に無効化してテスト')
  console.log('2. user_idを持つセッションを作成')
  console.log('3. APIでサービスロールキーを使用するよう修正')
}

debugSession().catch(console.error)