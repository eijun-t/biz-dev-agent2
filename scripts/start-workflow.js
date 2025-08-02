require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function startWorkflow(sessionId, userInput) {
  try {
    console.log('🚀 ワークフローを開始します');
    console.log('  - セッションID:', sessionId);
    console.log('  - ユーザー入力:', userInput || '（なし）');
    
    // セッションステータスを更新
    const { error: updateError } = await supabase
      .from('sessions')
      .update({ status: 'in_progress' })
      .eq('id', sessionId);
    
    if (updateError) {
      console.error('❌ セッション更新エラー:', updateError);
      return;
    }
    
    console.log('✅ セッションステータスを更新しました');
    
    // 情報収集エージェントを呼び出す
    console.log('\n🤖 情報収集エージェントを呼び出しています...');
    const { API_BASE_URL } = require('./config');
    const apiUrl = `${API_BASE_URL}/api/agents/information-collection`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: sessionId,
        userInput: userInput || ''
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ エージェントAPIエラー:', error);
      
      await supabase
        .from('sessions')
        .update({ 
          status: 'failed',
          error_message: 'エージェントの実行に失敗しました'
        })
        .eq('id', sessionId);
      
      return;
    }
    
    const result = await response.json();
    console.log('✅ 情報収集エージェント完了');
    console.log('  - カテゴリトレンド数:', result.data.categoryTrends?.length || 0);
    console.log('  - ケイパビリティ親和性数:', result.data.capabilityAffinities?.length || 0);
    
    // 結果をセッションに保存
    const { error: saveError } = await supabase
      .from('sessions')
      .update({
        status: 'completed',
        agent_outputs: {
          information_collection: result.data
        }
      })
      .eq('id', sessionId);
    
    if (saveError) {
      console.error('❌ 結果保存エラー:', saveError);
      return;
    }
    
    console.log('\n✅ ワークフロー完了');
    console.log(`🌐 ブラウザで確認: http://localhost:3002/session/${sessionId}`);
    
  } catch (error) {
    console.error('❌ エラー:', error);
    
    await supabase
      .from('sessions')
      .update({ 
        status: 'failed',
        error_message: error.message
      })
      .eq('id', sessionId);
  }
}

// コマンドライン引数から取得
const sessionId = process.argv[2];
const userInput = process.argv[3];

if (!sessionId) {
  console.log('使用方法: node scripts/start-workflow.js <session-id> [user-input]');
  console.log('例: node scripts/start-workflow.js 0587d436-398a-4575-93f5-9f6eb278cd47 "AIを活用した不動産価値評価"');
  process.exit(1);
}

startWorkflow(sessionId, userInput);