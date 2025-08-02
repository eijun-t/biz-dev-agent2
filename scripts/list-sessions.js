// 既存のセッション一覧を表示
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// 環境変数の読み込み
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase環境変数が設定されていません')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function listSessions() {
  console.log('📋 セッション一覧を取得中...\n')
  
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('❌ エラー:', error.message)
    console.log('\nℹ️  RLSポリシーにより、認証されたユーザーのセッションのみ表示可能です。')
    console.log('   ブラウザからアプリケーションにログインして、正規の手順でセッションを作成してください。')
    return
  }

  if (!sessions || sessions.length === 0) {
    console.log('セッションが見つかりません')
    return
  }

  console.log(`見つかったセッション: ${sessions.length}件\n`)
  
  sessions.forEach((session, index) => {
    console.log(`${index + 1}. セッション`)
    console.log('   ID:', session.id)
    console.log('   作成日時:', new Date(session.created_at).toLocaleString())
    console.log('   ステータス:', session.status)
    console.log('   ユーザー入力:', session.user_input?.substring(0, 50) + '...')
    console.log('')
  })

  if (sessions.length > 0) {
    console.log('📝 テストに使用する場合:')
    console.log(`   node scripts/test-direct.js ${sessions[0].id}`)
  }
}

listSessions().catch(console.error)