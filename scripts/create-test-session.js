// テスト用セッション作成スクリプト
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// 環境変数の読み込み
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ 環境変数が不足しています')
  console.log('必要な環境変数:')
  console.log('- NEXT_PUBLIC_SUPABASE_URL')
  console.log('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// サービスロールキーでクライアント作成
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createTestSession() {
  console.log('🔧 テスト用セッション作成スクリプト\n')

  try {
    // セッション作成
    const { data: session, error } = await supabase
      .from('sessions')
      .insert({
        user_input: 'AIを活用した不動産価値評価サービスの開発',
        status: 'in_progress'
      })
      .select()
      .single()

    if (error) {
      console.error('❌ エラー:', error)
      return
    }

    console.log('✅ セッション作成成功!\n')
    console.log('セッションID:', session.id)
    console.log('作成日時:', new Date(session.created_at).toLocaleString())
    console.log('ユーザー入力:', session.user_input)
    console.log('\n📋 このIDをコピーしてテストに使用:')
    console.log(`\n${session.id}\n`)
    console.log('🚀 テストコマンド:')
    console.log(`API_BASE_URL=http://localhost:3002 node scripts/test-direct.js ${session.id}`)

  } catch (error) {
    console.error('❌ 予期しないエラー:', error)
  }
}

createTestSession()