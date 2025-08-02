// エージェントの出力内容を確認するスクリプト
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
  console.log('使用方法: node scripts/check-agent-output.js <session-id>')
  process.exit(1)
}

// サービスロールキーでクライアント作成
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function checkAgentOutput() {
  console.log('🔍 エージェント出力確認\n')
  console.log('Session ID:', sessionId)
  console.log('='.repeat(50))

  // 1. research_dataテーブルの内容を確認
  console.log('\n📚 1. research_data（保存された調査データ）')
  console.log('-'.repeat(50))
  
  const { data: researchData, error: researchError } = await supabase
    .from('research_data')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (researchError) {
    console.log('❌ エラー:', researchError.message)
  } else if (researchData && researchData.length > 0) {
    console.log(`✅ ${researchData.length}件のデータが保存されています\n`)
    
    researchData.forEach((item, index) => {
      console.log(`${index + 1}. ${item.title}`)
      console.log(`   カテゴリ: ${item.category}`)
      console.log(`   サブカテゴリ: ${item.subcategory || 'なし'}`)
      console.log(`   データタイプ: ${item.data_type}`)
      console.log(`   信頼性スコア: ${item.reliability_score || '未設定'}`)
      console.log(`   作成日時: ${new Date(item.created_at).toLocaleString()}`)
      
      // content の一部を表示
      if (item.content) {
        console.log(`   内容プレビュー:`)
        const contentStr = JSON.stringify(item.content, null, 2)
        const preview = contentStr.substring(0, 300) + (contentStr.length > 300 ? '...' : '')
        console.log(`   ${preview.split('\n').join('\n   ')}`)
      }
      console.log('')
    })
  } else {
    console.log('⚠️  データが保存されていません')
  }

  // 2. 進捗追跡の確認
  console.log('\n📊 2. progress_tracking（処理進捗）')
  console.log('-'.repeat(50))
  
  const { data: progress, error: progressError } = await supabase
    .from('progress_tracking')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (progressError) {
    console.log('❌ エラー:', progressError.message)
  } else if (progress && progress.length > 0) {
    console.log(`✅ 最新${progress.length}件の進捗ログ:\n`)
    
    progress.reverse().forEach((p) => {
      const time = new Date(p.created_at).toLocaleTimeString()
      const status = p.status === 'error' ? '❌' : 
                     p.progress_percentage === 100 ? '✅' : '⏳'
      console.log(`${status} [${time}] ${p.agent_name}: ${p.message} (${p.progress_percentage}%)`)
    })
  }

  // 3. APIレスポンスの構造を表示
  console.log('\n\n🔄 3. 次のエージェントに渡されるデータ構造')
  console.log('-'.repeat(50))
  console.log(`
情報収集エージェントの出力は以下の形式です:

{
  "userAnalysis": {
    "businessDomain": "事業領域",
    "keywords": ["キーワード1", "キーワード2"],
    "targetMarket": "ターゲット市場",
    "researchFocus": ["調査項目1", "調査項目2"],
    "potentialOpportunities": ["機会1", "機会2"],
    "searchQueries": ["検索クエリ1", "検索クエリ2"]
  },
  "categoryTrends": [
    {
      "category": { "id": "proptech", "name": "PropTech" },
      "trends": [
        {
          "title": "トレンドタイトル",
          "description": "説明",
          "marketSize": { "value": 1000, "unit": "億円", "year": 2024 },
          "source": "URL",
          "reliability": 0.8
        }
      ],
      "summary": "カテゴリの要約"
    }
    // ... 他11カテゴリ
  ],
  "capabilityAffinities": [
    {
      "capabilityId": "UUID",
      "capabilityName": "ケイパビリティ名",
      "affinityScore": 0.85,
      "synergySenario": "シナジーシナリオ",
      "accelerationPotential": "加速可能性"
    }
    // ... 他のケイパビリティ
  ],
  "researchDataIds": ["UUID1", "UUID2", ...]
}
`)

  // 4. 実際のデータ取得をシミュレート
  console.log('\n📦 4. 実際のデータ取得（research_dataから再構築）')
  console.log('-'.repeat(50))
  
  if (researchData && researchData.length > 0) {
    // ユーザー分析を探す
    const userAnalysis = researchData.find(d => d.data_type === 'user_analysis')
    if (userAnalysis) {
      console.log('ユーザー分析:')
      console.log(JSON.stringify(userAnalysis.content, null, 2))
    }

    // カテゴリトレンドを探す
    const trends = researchData.filter(d => d.data_type === 'trend')
    if (trends.length > 0) {
      console.log('\nカテゴリトレンド（最初の1件）:')
      console.log(JSON.stringify(trends[0].content, null, 2))
    }

    // ケイパビリティ親和性を探す
    const affinities = researchData.find(d => d.data_type === 'analysis' && d.category === 'capability_affinity')
    if (affinities) {
      console.log('\nケイパビリティ親和性（上位3件）:')
      const top3 = affinities.content.slice(0, 3)
      console.log(JSON.stringify(top3, null, 2))
    }
  }

  console.log('\n💡 ヒント:')
  console.log('- research_dataテーブルに保存されたデータが次のエージェントで利用されます')
  console.log('- 各エージェントはsession_idを使ってデータを取得します')
  console.log('- データはJSON形式で構造化されています')
}

checkAgentOutput().catch(console.error)