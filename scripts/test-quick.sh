#!/bin/bash
# クイックテストスクリプト

# ポート3002で実行
export API_BASE_URL=http://localhost:3002

echo "🚀 Task4 クイックテスト（ポート3002）"
echo "================================="
echo ""

# セッションIDが引数で渡された場合
if [ -n "$1" ]; then
    echo "📋 既存セッションでテスト"
    echo "Session ID: $1"
    echo ""
    node scripts/test-direct.js "$1"
else
    echo "使用方法: ./scripts/test-quick.sh <session-id>"
    echo ""
    echo "セッションIDを取得する方法:"
    echo "1. ブラウザで http://localhost:3002 にアクセス"
    echo "2. ログインして「調査を開始」をクリック"
    echo "3. 開発者ツール（F12）のConsoleで以下を実行:"
    echo ""
    echo "const s = await window.supabase.from('sessions').select('*').order('created_at', { ascending: false }).limit(1);"
    echo "console.log(s.data[0]?.id);"
fi