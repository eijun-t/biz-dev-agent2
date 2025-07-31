# テストツール

このプロジェクトには、API機能をテストするためのツールが含まれています。

## Webテストページ

開発環境でのみアクセス可能なテストページです。

```bash
# 開発サーバーを起動
npm run dev

# ブラウザでアクセス
http://localhost:3000/test-api
```

### テスト可能な機能
- OpenAI Generate API
- OpenAI Analyze API
- SERPER Search API
- エラーハンドリング

## CLIテストスクリプト

コマンドラインからAPIをテストできます。

```bash
# 基本的な実行
node scripts/test-api.js

# 認証付きテスト（ログイン後、ブラウザの開発者ツールからトークンを取得）
TEST_AUTH_TOKEN=<your-token> node scripts/test-api.js
```

## 注意事項

- これらのテストツールは開発環境専用です
- 本番環境では `/test-api` ページは404エラーになります
- 現在、認証機能は一時的に無効化されています（TODO: 修正予定）