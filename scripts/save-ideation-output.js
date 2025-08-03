// アイディエーションエージェントの出力を保存するスクリプト
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function saveIdeationOutput() {
  try {
    console.log('=== アイディエーションエージェントV2 出力データ保存 ===\n');
    
    // 1. セッションを作成
    console.log('1. セッションを作成...');
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_input: 'スマートシティ・PropTech関連の新規事業',
        status: 'started'
      })
      .select()
      .single();

    if (sessionError) {
      console.error('セッション作成エラー:', sessionError);
      return;
    }

    console.log('セッション作成成功:', session.id);

    // 2. 市場データを準備
    const marketData = {
      trends: [
        {
          category: 'Smart City',
          trend_name: 'スマートビルディング',
          description: 'IoTとAIを活用した次世代ビル管理',
          market_size: 3000,
          growth_rate: 25,
          relevance_score: 9
        },
        {
          category: 'PropTech',
          trend_name: 'デジタルツイン',
          description: '建物・都市のデジタル複製による最適化',
          market_size: 2000,
          growth_rate: 35,
          relevance_score: 8
        }
      ],
      technologies: [
        {
          technology_name: 'IoTセンサー',
          description: '環境データのリアルタイム収集',
          maturity_level: 'growth',
          adoption_rate: 40,
          impact_potential: 8
        }
      ],
      regulations: [],
      opportunities: [
        {
          opportunity_name: '次世代オフィス',
          description: 'ポストコロナの新しい働き方に対応',
          target_market: '大手企業',
          estimated_market_size: 1500,
          competitive_landscape: '競合増加中'
        }
      ]
    };

    // 3. V2 APIを呼び出し
    console.log('\n2. アイディエーションエージェントV2を呼び出し...');
    
    const response = await fetch('http://localhost:3003/api/agents/ideation-v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: session.id,
        marketData: marketData
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('\n✅ 成功!');
      
      // 完全な出力データを作成
      const fullOutput = {
        sessionId: session.id,
        marketData: marketData,
        businessIdeas: result.ideas.map(idea => ({
          id: idea.id,
          session_id: idea.session_id,
          title: idea.title,
          description: idea.description,
          target_market: idea.target_market,
          market_size: idea.market_size,
          revenue_model: idea.revenue_model,
          initial_investment: idea.initial_investment,
          projected_profit: idea.projected_profit,
          timeline: idea.timeline,
          mitsubishi_assets: idea.mitsubishi_assets,
          capability_utilization: idea.capability_utilization,
          is_selected: idea.is_selected,
          created_at: idea.created_at,
          // メモリベースの追加フィールド
          capability_scenario: idea.capability_scenario,
          capability_categories: idea.capability_categories,
          network_partners: idea.network_partners
        }))
      };
      
      // ファイルに保存
      const outputPath = './ideation-output.json';
      fs.writeFileSync(outputPath, JSON.stringify(fullOutput, null, 2));
      console.log(`\n出力データを保存しました: ${outputPath}`);
      
      // コンソールにも表示
      console.log('\n=== 完全な出力データ ===');
      console.log(JSON.stringify(fullOutput, null, 2));
      
      // セッション完了
      await supabase
        .from('sessions')
        .update({ status: 'completed' })
        .eq('id', session.id);
        
    } else {
      console.error('\n❌ エラー:', result.error);
    }
    
  } catch (error) {
    console.error('❌ 例外エラー:', error.message);
  }
}

saveIdeationOutput();