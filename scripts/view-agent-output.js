require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function viewAgentOutput(sessionId) {
  try {
    console.log('📊 情報収集エージェントの出力確認\n');
    
    // セッション情報の取得
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (sessionError) {
      console.error('❌ セッション取得エラー:', sessionError);
      return;
    }
    
    console.log('📝 セッション情報:');
    console.log(`  - ID: ${session.id}`);
    console.log(`  - ステータス: ${session.status}`);
    console.log(`  - 作成日時: ${session.created_at}`);
    console.log(`  - エージェント出力:`, session.agent_outputs ? Object.keys(session.agent_outputs) : 'なし');
    
    // エージェント出力の詳細表示
    if (session.agent_outputs?.information_collection) {
      const output = session.agent_outputs.information_collection;
      console.log('\n🤖 情報収集エージェント出力:');
      console.log('─'.repeat(80));
      
      // ユーザー分析
      if (output.userAnalysis) {
        console.log('\n1️⃣ ユーザー分析:');
        console.log(`  - 推定事業領域: ${output.userAnalysis.businessDomain || '不明'}`);
        console.log(`  - ターゲット市場: ${output.userAnalysis.targetMarket || '不明'}`);
        console.log(`  - キーワード: ${output.userAnalysis.keywords?.join(', ') || '不明'}`);
      }
      
      // カテゴリトレンド
      if (output.categoryTrends && output.categoryTrends.length > 0) {
        console.log('\n2️⃣ カテゴリトレンド (全12カテゴリ):');
        output.categoryTrends.forEach((trend, index) => {
          const categoryName = trend.category?.name || trend.category || '不明';
          console.log(`\n  ${index + 1}. ${categoryName}:`);
          console.log(`     - 要約: ${trend.summary || '不明'}`);
          console.log(`     - 関連性スコア: ${trend.relevanceScore || '不明'}/10`);
          console.log(`     - ビジネス機会: ${trend.businessOpportunity || '不明'}`);
        });
      }
      
      // ケイパビリティ親和性
      if (output.capabilityAffinities && output.capabilityAffinities.length > 0) {
        console.log('\n3️⃣ 三菱地所ケイパビリティとの親和性:');
        output.capabilityAffinities.forEach((affinity, index) => {
          console.log(`\n  ${index + 1}. ${affinity.capabilityName}:`);
          console.log(`     - 親和性スコア: ${affinity.affinityScore}/10`);
          console.log(`     - 活用シナリオ: ${affinity.applicationScenario}`);
          console.log(`     - 具体的アクション: ${affinity.specificAction}`);
        });
      }
      
      console.log('\n' + '─'.repeat(80));
    }
    
    // research_dataの詳細確認
    const { data: researchData, error: researchError } = await supabase
      .from('research_data')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    
    if (!researchError && researchData && researchData.length > 0) {
      console.log('\n💾 保存されたresearch_data詳細:');
      console.log(`  合計: ${researchData.length}件\n`);
      
      // カテゴリ別に分類
      const byCategory = {};
      researchData.forEach(data => {
        if (!byCategory[data.category]) {
          byCategory[data.category] = [];
        }
        byCategory[data.category].push(data);
      });
      
      // カテゴリごとに表示
      Object.entries(byCategory).forEach(([category, items]) => {
        console.log(`\n📁 ${category} (${items.length}件):`);
        items.forEach((item, index) => {
          console.log(`\n  ${index + 1}. ${item.title}`);
          if (item.subcategory) {
            console.log(`     サブカテゴリ: ${item.subcategory}`);
          }
          console.log(`     データタイプ: ${item.data_type}`);
          console.log(`     信頼性スコア: ${item.reliability_score || 'N/A'}`);
          
          // contentの内容を整形して表示
          if (item.content) {
            console.log('     内容:');
            Object.entries(item.content).forEach(([key, value]) => {
              if (typeof value === 'object' && value !== null) {
                console.log(`       - ${key}: ${JSON.stringify(value, null, 2).split('\n').join('\n         ')}`);
              } else {
                console.log(`       - ${key}: ${value}`);
              }
            });
          }
        });
      });
    }
    
    console.log('\n✅ 出力確認完了');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

// コマンドライン引数からセッションIDを取得
const sessionId = process.argv[2];

if (!sessionId) {
  console.log('使用方法: node scripts/view-agent-output.js <session-id>');
  console.log('例: node scripts/view-agent-output.js 49cab3e6-b36a-4e9e-b360-f45d1f7a7a55');
  process.exit(1);
}

viewAgentOutput(sessionId);