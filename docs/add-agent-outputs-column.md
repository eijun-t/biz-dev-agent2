# agent_outputsカラムの追加

sessionsテーブルにagent_outputsカラムを追加するためのSQL。

## 手順

1. [Supabaseダッシュボード](https://supabase.com/dashboard)にログイン
2. プロジェクトを選択
3. 左メニューから「SQL Editor」を選択
4. 新規クエリを作成
5. 以下のSQLを貼り付けて実行

```sql
-- agent_outputsカラムの追加
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS agent_outputs JSONB;

-- error_messageカラムの追加（エラー時のメッセージ保存用）
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- コメントの追加
COMMENT ON COLUMN public.sessions.agent_outputs IS '各エージェントの出力結果を保存するJSON';
COMMENT ON COLUMN public.sessions.error_message IS 'エラー発生時のメッセージ';
```

## 確認方法

カラムが正しく追加されたか確認：

```bash
node scripts/check-table-schema.js
```