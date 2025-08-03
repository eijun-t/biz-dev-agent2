#!/bin/bash

# 情報収集エージェントAPIのローカルテスト
# 使用方法: ./scripts/test-api-local.sh

echo "🚀 情報収集エージェントAPIテスト"
echo "================================="

# 環境変数チェック
if [ ! -f .env.local ]; then
    echo "❌ .env.localファイルが見つかりません"
    exit 1
fi

# 必要な環境変数の確認
source .env.local
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$OPENAI_API_KEY" ] || [ -z "$SERPER_API_KEY" ]; then
    echo "❌ 必要な環境変数が設定されていません:"
    [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] && echo "  - NEXT_PUBLIC_SUPABASE_URL"
    [ -z "$OPENAI_API_KEY" ] && echo "  - OPENAI_API_KEY"
    [ -z "$SERPER_API_KEY" ] && echo "  - SERPER_API_KEY"
    exit 1
fi

echo "✅ 環境変数確認OK"
echo ""

# テストセッション作成
echo "📝 テストセッション作成中..."
SESSION_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
echo "Session ID: $SESSION_ID"

# APIテスト実行
echo ""
echo "🤖 API呼び出しテスト"
echo "URL: http://localhost:3000/api/agents/information-collection"
echo ""

# cURLでAPIを呼び出し
curl -X POST http://localhost:3000/api/agents/information-collection \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "'$SESSION_ID'",
    "userInput": "AIを活用した不動産価値評価サービスの開発"
  }' \
  -w "\n\nHTTP Status: %{http_code}\nTime: %{time_total}s\n" \
  | jq '.'

echo ""
echo "✅ テスト完了"
echo ""
echo "📊 結果確認方法:"
echo "1. Supabaseダッシュボードで以下のテーブルを確認:"
echo "   - sessions (id: $SESSION_ID)"
echo "   - progress_tracking"
echo "   - research_data"
echo ""
echo "2. Node.jsテストスクリプトで詳細確認:"
echo "   node scripts/test-information-collection.js"