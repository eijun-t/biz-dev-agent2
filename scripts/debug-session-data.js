require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugSessionData(sessionId) {
  try {
    console.log('🔍 セッションデータのデバッグ:', sessionId);
    
    // セッション情報の取得
    const { data: session, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (error) {
      console.error('❌ エラー:', error);
      return;
    }
    
    console.log('\n📊 セッション基本情報:');
    console.log('  - ID:', session.id);
    console.log('  - ステータス:', session.status);
    console.log('  - ユーザー入力:', session.user_input);
    
    if (session.agent_outputs) {
      console.log('\n🤖 agent_outputsの構造:');
      console.log(JSON.stringify(session.agent_outputs, null, 2));
      
      if (session.agent_outputs.information_collection) {
        const ic = session.agent_outputs.information_collection;
        console.log('\n📝 information_collectionの内容:');
        console.log('  - userAnalysis:', ic.userAnalysis ? '存在' : '不在');
        console.log('  - categoryTrends:', Array.isArray(ic.categoryTrends) ? `${ic.categoryTrends.length}件` : '不在');
        console.log('  - capabilityAffinities:', Array.isArray(ic.capabilityAffinities) ? `${ic.capabilityAffinities.length}件` : '不在');
        
        if (ic.categoryTrends && ic.categoryTrends.length > 0) {
          console.log('\n📊 categoryTrendsの最初のアイテム:');
          console.log(JSON.stringify(ic.categoryTrends[0], null, 2));
        }
      }
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

const sessionId = process.argv[2];
if (!sessionId) {
  console.log('使用方法: node scripts/debug-session-data.js <session-id>');
  process.exit(1);
}

debugSessionData(sessionId);