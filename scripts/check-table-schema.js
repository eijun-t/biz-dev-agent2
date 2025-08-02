require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTableSchema() {
  try {
    // sessionsテーブルから1行取得してカラムを確認
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ エラー:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('📊 sessionsテーブルのカラム:');
      Object.keys(data[0]).forEach(key => {
        console.log(`  - ${key}: ${typeof data[0][key]}`);
      });
    } else {
      console.log('⚠️  データがありません');
    }
    
    // final_reportsテーブルも確認
    const { data: reportData, error: reportError } = await supabase
      .from('final_reports')
      .select('*')
      .limit(1);
    
    if (!reportError && reportData && reportData.length > 0) {
      console.log('\n📊 final_reportsテーブルのカラム:');
      Object.keys(reportData[0]).forEach(key => {
        console.log(`  - ${key}: ${typeof reportData[0][key]}`);
      });
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

checkTableSchema();