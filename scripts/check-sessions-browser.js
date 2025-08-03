// ブラウザのコンソールで実行するスクリプト
// セッションIDを確認するために使用

console.log('📋 セッション情報を確認します...\n');

// Supabaseクライアントを取得（ブラウザのグローバル変数から）
if (typeof window !== 'undefined' && window.supabase) {
  const supabase = window.supabase;
  
  // セッション一覧を取得
  supabase
    .from('sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)
    .then(({ data: sessions, error }) => {
      if (error) {
        console.error('❌ エラー:', error);
        return;
      }
      
      if (sessions && sessions.length > 0) {
        console.log(`✅ ${sessions.length}件のセッションが見つかりました:\n`);
        
        sessions.forEach((session, index) => {
          console.log(`${index + 1}. セッション`);
          console.log(`   ID: ${session.id}`);
          console.log(`   作成日時: ${new Date(session.created_at).toLocaleString()}`);
          console.log(`   ステータス: ${session.status}`);
          console.log(`   入力: ${session.user_input?.substring(0, 50)}...`);
          console.log('');
        });
        
        console.log('💡 最新のセッションIDをコピー:');
        console.log(`   ${sessions[0].id}`);
        console.log('\n📝 ターミナルでテスト実行:');
        console.log(`   node scripts/test-direct.js ${sessions[0].id}`);
      } else {
        console.log('セッションが見つかりません');
      }
    });
} else {
  console.log('Supabaseクライアントが見つかりません');
  console.log('開発者ツールのコンソールで以下を実行してください:');
  console.log(`
// セッションデータを確認
const sessionData = localStorage.getItem('sb-${location.hostname}-auth-token');
if (sessionData) {
  const parsed = JSON.parse(sessionData);
  console.log('User ID:', parsed.user?.id);
}
  `);
}