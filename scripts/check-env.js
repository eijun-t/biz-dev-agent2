// 環境変数チェックスクリプト
const fs = require('fs')
const path = require('path')

// 環境変数の読み込み
const envPath = path.join(__dirname, '..', '.env.local')
console.log('📁 環境変数ファイル:', envPath)
console.log('   存在:', fs.existsSync(envPath) ? '✅' : '❌')
console.log('')

if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath })
}

// 必要な環境変数のリスト
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'OPENAI_API_KEY',
  'SERPER_API_KEY'
]

console.log('🔧 環境変数チェック:')
console.log('====================')

let allSet = true

requiredEnvVars.forEach(varName => {
  const value = process.env[varName]
  const isSet = !!value
  
  if (!isSet) allSet = false
  
  console.log(`${varName}:`)
  console.log(`  設定: ${isSet ? '✅' : '❌'}`)
  
  if (isSet) {
    // 値の一部を表示（セキュリティのため最初と最後の数文字のみ）
    if (value.length > 10) {
      const preview = value.substring(0, 4) + '...' + value.substring(value.length - 4)
      console.log(`  値: ${preview}`)
    } else {
      console.log(`  値: (短すぎる値)`)
    }
  }
  console.log('')
})

if (!allSet) {
  console.log('❌ 一部の環境変数が設定されていません')
  console.log('\n📝 .env.localファイルに以下の形式で設定してください:')
  console.log('')
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      console.log(`${varName}=your_value_here`)
    }
  })
} else {
  console.log('✅ すべての環境変数が設定されています')
  
  // Supabase接続テスト
  console.log('\n🔌 Supabase接続テスト...')
  const { createClient } = require('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  
  supabase
    .from('sessions')
    .select('count')
    .limit(1)
    .then(({ data, error }) => {
      if (error) {
        console.log('❌ Supabase接続エラー:', error.message)
      } else {
        console.log('✅ Supabase接続成功')
      }
    })
}