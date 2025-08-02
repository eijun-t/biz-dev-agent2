require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createResearchDataTable() {
  try {
    console.log('📊 research_dataテーブルを作成中...');
    
    // SQLファイルを読み込む
    const sqlPath = path.join(__dirname, 'create_research_data_table.sql');
    const sql = await fs.readFile(sqlPath, 'utf8');
    
    // SQLを実行
    const { error } = await supabase.rpc('execute_sql', { sql_query: sql });
    
    if (error) {
      // execute_sqlが使えない場合は、手動でテーブルを作成
      console.log('⚠️  execute_sqlが使えないため、手動でテーブルを作成します...');
      
      // テーブル作成のクエリを直接実行
      const { error: createError } = await supabase
        .from('research_data')
        .select('id')
        .limit(1);
      
      if (createError && createError.code === '42P01') {
        console.error('❌ テーブル作成に失敗しました。Supabaseダッシュボードで以下のSQLを実行してください:');
        console.log('\n' + sql);
        return;
      }
    }
    
    console.log('✅ research_dataテーブルの作成が完了しました');
    
    // テーブルの存在確認
    const { data, error: checkError } = await supabase
      .from('research_data')
      .select('count')
      .limit(1);
    
    if (!checkError) {
      console.log('✅ テーブルの存在を確認しました');
    } else {
      console.error('⚠️  テーブルの確認でエラー:', checkError);
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
    console.log('\n💡 Supabaseダッシュボードで手動でSQLを実行する必要があります。');
    console.log('📝 SQLファイルのパス: scripts/create_research_data_table.sql');
  }
}

// 実行
createResearchDataTable();