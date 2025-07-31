# ビジネス提案エージェント

三菱地所新事業開発部門向けAIビジネス提案生成システム

## 概要

このシステムは、AIエージェント技術を活用して、事業アイデアの発掘・評価・企画を一貫して支援するツールです。

## セットアップ

1. 依存関係のインストール
```bash
npm install
```

2. 環境変数の設定
`.env.local` ファイルに以下を設定：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `SERPER_API_KEY`

3. データベースのセットアップ
Supabase SQL Editorで `/supabase/schema.sql` を実行

4. 開発サーバーの起動
```bash
npm run dev
```

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **バックエンド**: Next.js API Routes
- **データベース**: Supabase (PostgreSQL)
- **認証**: Supabase Auth
- **AI**: OpenAI API (GPT-4)
- **検索**: SERPER API