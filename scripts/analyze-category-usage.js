require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeCategoryUsage(sessionId) {
  try {
    // セッション情報の取得
    const { data: session, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (error || !session) {
      console.error('セッション取得エラー:', error);
      return;
    }
    
    console.log('📊 カテゴリデータの使用分析\n');
    console.log('ユーザー入力:', session.user_input);
    console.log('');
    
    // agent_outputsの確認
    if (session.agent_outputs?.information_collection) {
      const output = session.agent_outputs.information_collection;
      
      // カテゴリトレンドの確認
      if (output.categoryTrends) {
        console.log('📈 次のエージェントに渡されるカテゴリ数:', output.categoryTrends.length);
        console.log('\n各カテゴリの関連性スコア:');
        
        output.categoryTrends.forEach((trend, index) => {
          const categoryName = trend.category?.name || '不明';
          const score = trend.relevanceScore || '未評価';
          console.log(`${index + 1}. ${categoryName}: ${score}`);
        });
        
        // 関連性の分布
        console.log('\n📊 関連性スコアの分布:');
        const highRelevance = output.categoryTrends.filter(t => (t.relevanceScore || 0) >= 0.7).length;
        const mediumRelevance = output.categoryTrends.filter(t => (t.relevanceScore || 0) >= 0.4 && (t.relevanceScore || 0) < 0.7).length;
        const lowRelevance = output.categoryTrends.filter(t => (t.relevanceScore || 0) < 0.4).length;
        
        console.log(`  高関連性 (0.7以上): ${highRelevance}カテゴリ`);
        console.log(`  中関連性 (0.4-0.7): ${mediumRelevance}カテゴリ`);
        console.log(`  低関連性 (0.4未満): ${lowRelevance}カテゴリ`);
        
        // 実際に保存されているか確認
        const { data: researchData } = await supabase
          .from('research_data')
          .select('subcategory, content')
          .eq('session_id', sessionId)
          .eq('category', 'market_trend');
        
        console.log('\n💾 research_dataテーブルに保存されたカテゴリ数:', researchData?.length || 0);
      }
    }
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

const sessionId = process.argv[2];
if (!sessionId) {
  console.log('使用方法: node scripts/analyze-category-usage.js <session-id>');
  process.exit(1);
}

analyzeCategoryUsage(sessionId);