# ビジネス提案エージェント セットアップガイド

## 環境変数の設定

プロジェクトのルートディレクトリに `.env.local` ファイルを作成し、以下の環境変数を設定してください：

```bash
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# SERPER API
SERPER_API_KEY=your_serper_api_key
```

## データベースセットアップ

### 1. research_dataテーブルの作成

Supabaseのダッシュボードで以下のSQLを実行してください：

```sql
-- scripts/create_research_data_table.sql の内容を実行
```

または、Supabase CLIを使用している場合：

```bash
supabase db reset
supabase db push
```

### 2. 初期データの投入（オプション）

必要に応じて、ケイパビリティデータやアセットデータを投入してください。

## Task 4 実装内容

Task 4「情報収集エージェントの実装」では以下が実装されました：

### 実装ファイル

1. **エラーハンドリングシステム**
   - `/lib/error-handler.ts` - カスタムエラークラスとエラーハンドラー
   - `/lib/agents/base-agent.ts` - 全エージェントの基底クラス

2. **APIクライアント**
   - `/lib/openai-client.ts` - OpenAI APIクライアント
   - `/lib/serper-client.ts` - SERPER APIクライアント

3. **カテゴリ定義**
   - `/lib/constants/categories.ts` - 12カテゴリの定義

4. **情報収集エージェント**
   - `/lib/agents/information-collection-agent.ts` - エージェント本体
   - `/app/api/agents/information-collection/route.ts` - APIエンドポイント

5. **データベース**
   - `/scripts/create_research_data_table.sql` - research_dataテーブル作成SQL
   - `/types/database.ts` - 型定義の更新

### 主な機能

- **ユーザー入力解析**: 事業領域の特定と調査計画策定
- **12カテゴリのトレンド収集**: PropTech、スマートシティ等の並列トレンド収集
- **ケイパビリティ親和性評価**: 事業とケイパビリティのシナジー評価
- **エラーハンドリング**: エラー隠蔽禁止、明確なエラー表示
- **進捗追跡**: リアルタイムでの処理状況更新

### API使用方法

```typescript
// POST /api/agents/information-collection
{
  "sessionId": "session-uuid",
  "userId": "user-uuid",
  "userInput": "AIを活用した不動産価値評価サービス"
}

// レスポンス
{
  "success": true,
  "data": {
    "userAnalysis": { ... },
    "categoryTrends": [ ... ],
    "capabilityAffinities": [ ... ],
    "researchDataIds": [ ... ]
  }
}
```

## 次のステップ

Task 5以降のエージェント実装に進む前に、以下を確認してください：

1. 環境変数が正しく設定されているか
2. research_dataテーブルが作成されているか
3. APIキーが有効か（特にOpenAIとSERPER）
4. Supabaseのセキュリティルールが適切に設定されているか