# Task4 テストガイド

## テスト方法

### 1. 開発サーバーの起動

まず、Next.jsの開発サーバーを起動します：

```bash
npm run dev
```

### 2. 環境変数の確認

`.env.local`に以下が設定されていることを確認：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`
- `SERPER_API_KEY`

### 3. データベースセットアップの確認

Supabaseダッシュボードで以下のテーブルが存在することを確認：
- `sessions`
- `progress_tracking`
- `research_data`
- `capabilities`

research_dataテーブルがない場合は、`scripts/create_research_data_table.sql`を実行してください。

### 4. テスト実行

#### 方法1: Node.jsスクリプト（推奨）

```bash
node scripts/test-information-collection.js
```

このスクリプトは以下を実行します：
1. テストセッションの作成
2. 情報収集エージェントAPIの呼び出し
3. 進捗追跡の確認
4. 保存されたデータの確認

#### 方法2: シェルスクリプト

```bash
./scripts/test-api-local.sh
```

#### 方法3: 手動でcURL

```bash
# 1. まずセッションを作成（Supabaseダッシュボードまたは以下のコマンド）
SESSION_ID="your-session-id"

# 2. API呼び出し
curl -X POST http://localhost:3000/api/agents/information-collection \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "'$SESSION_ID'",
    "userInput": "AIを活用した不動産価値評価サービスの開発"
  }'
```

## 期待される結果

### 成功時のレスポンス例

```json
{
  "success": true,
  "data": {
    "userAnalysis": {
      "businessDomain": "不動産テック・AI価値評価",
      "keywords": ["AI", "不動産価値評価", "PropTech"],
      "targetMarket": "不動産投資家、不動産会社",
      "researchFocus": ["AI技術動向", "不動産市場規模"],
      "searchQueries": ["AI 不動産価値評価", "PropTech 市場規模"]
    },
    "categoryTrends": [
      {
        "category": { "id": "proptech", "name": "PropTech" },
        "trends": [...],
        "summary": "..."
      }
      // 他11カテゴリ
    ],
    "capabilityAffinities": [
      {
        "capabilityId": "...",
        "capabilityName": "...",
        "affinityScore": 0.85,
        "synergySenario": "...",
        "accelerationPotential": "..."
      }
    ],
    "researchDataIds": ["uuid1", "uuid2", ...]
  }
}
```

### エラー時のレスポンス例

```json
{
  "error": true,
  "code": "MISSING_SESSION_ID",
  "message": "Session ID is required"
}
```

## トラブルシューティング

### 1. "MISSING_API_KEY"エラー

環境変数が正しく設定されているか確認してください。

### 2. "INVALID_SESSION"エラー

指定したセッションIDがデータベースに存在するか確認してください。

### 3. タイムアウトエラー

処理に10分以上かかる場合はタイムアウトします。入力を簡潔にするか、ネットワーク接続を確認してください。

### 4. SERPER APIエラー

- APIキーが有効か確認
- 利用制限に達していないか確認
- ネットワーク接続を確認

## データベース確認

テスト後、Supabaseダッシュボードで以下を確認できます：

1. **progress_tracking**テーブル
   - エージェントの進捗状況
   - エラーメッセージ（ある場合）

2. **research_data**テーブル
   - 収集されたトレンドデータ
   - ケイパビリティ親和性評価結果
   - ユーザー入力分析結果

## クリーンアップ

テストデータを削除する場合：

```bash
node scripts/test-information-collection.js cleanup [SESSION_ID]
```