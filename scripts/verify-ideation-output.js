// アイディエーションエージェントの出力を詳細に確認
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyOutput() {
  try {
    console.log('=== アイディエーションエージェントの出力確認 ===\n');
    
    // 1. 最新のセッションを取得
    console.log('1. 最新のセッションを確認...');
    const { data: sessions, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (sessionError) {
      console.error('セッション取得エラー:', sessionError);
      return;
    }
    
    console.log(`最新${sessions.length}件のセッション:`);
    sessions.forEach((session, index) => {
      console.log(`\n[${index + 1}] セッションID: ${session.id}`);
      console.log(`    作成日時: ${session.created_at}`);
      console.log(`    ステータス: ${session.status}`);
      console.log(`    ユーザー入力: ${session.user_input || 'なし'}`);
    });
    
    // 2. 最新のビジネスアイデアを確認
    console.log('\n\n2. 生成されたビジネスアイデアを確認...');
    const latestSessionId = sessions[0]?.id;
    
    if (latestSessionId) {
      const { data: ideas, error: ideasError } = await supabase
        .from('business_ideas')
        .select('*')
        .eq('session_id', latestSessionId);
      
      if (ideasError) {
        console.error('アイデア取得エラー:', ideasError);
      } else {
        console.log(`\nセッション ${latestSessionId} のアイデア数: ${ideas.length}`);
        
        ideas.forEach((idea, index) => {
          console.log(`\n=== アイデア ${index + 1} ===`);
          console.log('ID:', idea.id);
          console.log('タイトル:', idea.title);
          console.log('説明:', idea.description);
          console.log('ターゲット市場:', idea.target_market);
          console.log('市場規模:', idea.market_size, '億円');
          console.log('収益モデル:', idea.revenue_model);
          console.log('初期投資:', idea.initial_investment, '億円');
          console.log('想定営業利益:', idea.projected_profit, '億円');
          console.log('タイムライン:', idea.timeline);
          console.log('三菱地所アセット:', idea.mitsubishi_assets);
          console.log('ケイパビリティ活用度:', idea.capability_utilization);
          console.log('選定フラグ:', idea.is_selected);
          console.log('作成日時:', idea.created_at);
        });
      }
    }
    
    // 3. 次のエージェント（Critic Agent）に渡すデータ形式を確認
    console.log('\n\n3. 次のエージェントに渡すデータ形式...');
    console.log('\nCritic Agentが受け取るデータ構造:');
    console.log('```typescript');
    console.log('interface BusinessIdea {');
    console.log('  id: string;');
    console.log('  session_id: string;');
    console.log('  title: string;');
    console.log('  description: string;');
    console.log('  target_market: string;');
    console.log('  market_size: number;  // 1000億円以上');
    console.log('  revenue_model: string;');
    console.log('  initial_investment: number;');
    console.log('  projected_profit: number;  // 10億円目標');
    console.log('  timeline: string;');
    console.log('  mitsubishi_assets: string[];');
    console.log('  capability_utilization: Record<string, number>;');
    console.log('  is_selected: boolean;');
    console.log('  created_at: string;');
    console.log('}');
    console.log('```');
    
    // 4. メモリコンテキストの形式を確認
    console.log('\n\n4. SessionContext（メモリ内）のデータ形式...');
    console.log('```typescript');
    console.log('interface SessionContext {');
    console.log('  sessionId: string;');
    console.log('  userInput: string | null;');
    console.log('  marketData?: MarketData;');
    console.log('  businessIdeas?: BusinessIdea[];  // <- ここにアイデアが格納される');
    console.log('  selectedIdea?: BusinessIdea;');
    console.log('  analysisResults?: AnalysisResults;');
    console.log('}');
    console.log('```');
    
    // 5. 実際のAPIレスポンス例
    console.log('\n\n5. APIレスポンス例...');
    const exampleResponse = {
      success: true,
      ideas: sessions[0] ? [{
        id: "4a78937c-d03f-4701-b88e-a4db200bb90a",
        session_id: latestSessionId,
        title: "スマート農業プラットフォーム",
        description: "AIとIoT技術を活用した農業支援プラットフォーム...",
        target_market: "日本国内の農業従事者及び農業法人",
        market_size: 1200,
        revenue_model: "サブスクリプションモデルと手数料モデル",
        initial_investment: 120,
        projected_profit: 12,
        timeline: "5-10年",
        mitsubishi_assets: [],
        capability_utilization: {},
        is_selected: false,
        created_at: new Date().toISOString()
      }] : [],
      count: 1
    };
    
    console.log('\nAPIレスポンス形式:');
    console.log(JSON.stringify(exampleResponse, null, 2));
    
    console.log('\n\n=== 確認完了 ===');
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

verifyOutput();