# Implementation Plan

- [x] 1. Next.jsプロジェクト構造とSupabase設定
  - Next.jsプロジェクトの初期化（TypeScript設定含む）
  - 基本ディレクトリ構造の作成（app/, lib/, types/）
  - 依存関係管理（package.json, next.config.js）
  - _Requirements: 7.1, 7.2, 11.1_
  - _Note: Environment variables already configured in .env.local_

- [x] 2. Supabaseデータベーススキーマとクライアント設定
  - [x] 2.1 データベーススキーマの作成
    - sessions, business_ideas, evaluation_results等のテーブル作成
    - 三菱地所固有データテーブル（mitsubishi_assets, network_companies）の作成
    - Row Level Security (RLS)ポリシーの設定
    - _Requirements: 1.5, 10.1, 10.2, 11.3_

  - [x] 2.2 TypeScript型定義とSupabaseクライアント
    - データベース型定義ファイルの作成（types/database.ts）
    - Supabaseクライアントの設定（lib/supabase.ts）
    - カスタムフック（useSupabase, useRealtime）の実装
    - _Requirements: 7.2, 7.3, 9.2_

  - [x] 2.3 認証システムの実装
    - Supabase Authの設定
    - 認証コンポーネントの作成
    - セッション管理機能の実装
    - _Requirements: 11.1, 11.2_

- [x] 3. 外部API統合とエラーハンドリングの実装
  - [x] 3.1 OpenAI API統合（Next.js App Router API Routes）
    - app/api/openai/配下にAPIエンドポイント作成
    - OpenAI APIクライアントの実装（lib/openai-client.ts）
    - レート制限とエラーハンドリング機能（エラー隠蔽禁止）
    - 指数バックオフによる再試行メカニズム
    - API障害時の明確なエラーメッセージ表示
    - _Requirements: 8.1, エラーハンドリング要件_

  - [x] 3.2 SERPER API統合（Next.js App Router API Routes）
    - app/api/serper/配下にAPIエンドポイント作成
    - SERPER APIクライアントの実装（lib/serper-client.ts）
    - 検索結果の品質チェック機能
    - 代替検索手段への切り替え機能
    - 検索失敗時の明確なエラー表示
    - _Requirements: 8.2, 5.1, エラーハンドリング要件_

  - [x] 3.3 統合エラーハンドリングシステム
    - ErrorHandlerクラスの実装（lib/error-handler.ts）
    - BaseAgentクラスの実装（エラー隠蔽禁止の原則）
    - カスタムエラークラス（ApiError, DataQualityError, TimeoutError）の実装
    - ErrorDisplayコンポーネントの実装（components/ErrorDisplay.tsx）
    - エラー分類と明示的な表示機能
    - Supabaseへのエラーログ保存機能
    - デフォルト値・モックデータによるエラー隠蔽の禁止
    - _Requirements: 8.3, エラーハンドリング要件_

- [ ] 4. 情報収集エージェントの実装（Next.js App Router API Routes + Supabase）
  - [ ] 4.1 ユーザー入力処理機能
    - app/api/agents/information-collection/route.tsの作成
    - lib/agents/information-collection-agent.tsの実装
    - ユーザー入力の解析と調査計画策定機能
    - 入力に基づく動的な調査戦略の生成
    - 結果のSupabaseへの保存とリアルタイム更新
    - _Requirements: 1.1, 1.2_

  - [ ] 4.2 デフォルトカテゴリ収集機能
    - 12カテゴリ（PropTech・スマートシティ・FinTech等）のトレンド収集
    - カテゴリ別情報収集の並列処理実装
    - 収集データの構造化とSupabaseへの保存
    - 進捗状況のリアルタイム更新
    - _Requirements: 1.3_

  - [ ] 4.3 市場・技術情報収集機能
    - SERPER APIを使用した市場規模調査機能
    - 技術トレンドの収集と分析機能
    - 規制環境の調査機能
    - research_dataテーブルへのデータ保存
    - _Requirements: 1.4, 5.1_

  - [ ] 4.4 ケイパビリティ親和性評価機能
    - Supabaseから三菱地所4大ケイパビリティデータの取得
    - 親和性スコア算出アルゴリズムの実装
    - 具体的な活用シナリオ生成機能
    - 評価結果のSupabaseへの保存
    - _Requirements: 1.5, 10.2_

- [ ] 5. アイディエーションエージェントの実装（Next.js App Router API Routes + Supabase）
  - [ ] 5.1 事業アイデア生成機能
    - app/api/agents/ideation/route.tsの作成
    - lib/agents/ideation-agent.tsの実装
    - 収集情報に基づく複数事業アイデアの生成
    - OpenAI APIを活用した創造的なアイデア生成
    - business_ideasテーブルへのアイデア保存
    - _Requirements: 2.1_

  - [ ] 5.2 既存アセット組み合わせ機能
    - Supabaseからmitsubishi_assetsデータの取得
    - 丸の内・みなとみらい等既存アセットとの組み合わせ提案
    - アセット活用シナリオの生成
    - 投資効率の概算機能
    - _Requirements: 2.1, 10.1_

  - [ ] 5.3 企業ネットワーク連携シナリオ作成
    - Supabaseからnetwork_companiesデータの取得
    - テナント企業群・三菱グループ・パートナーとの連携シナリオ
    - ネットワーク効果の定量化
    - 協業可能性の評価機能
    - _Requirements: 2.2, 10.3_

  - [ ] 5.4 収益性評価機能
    - 営業利益10億円達成可能性の初期評価
    - 5-10年での収益達成シナリオ作成
    - 初期投資規模の概算機能
    - 評価結果のSupabaseへの保存
    - _Requirements: 2.3_

- [ ] 6. 評価エージェントの実装（Next.js App Router API Routes + Supabase）
  - [ ] 6.1 6軸評価システム
    - app/api/agents/evaluation/route.tsの作成
    - lib/agents/evaluation-agent.tsの実装
    - 独創性・実現可能性・市場性・シナジー適合性・競合優位性・リスクバランスの評価
    - OpenAI APIを活用した各軸の評価アルゴリズム実装
    - evaluation_resultsテーブルへの評価結果保存
    - _Requirements: 3.1_

  - [ ] 6.2 数値化・スコアリング機能
    - 営業利益10億円達成可能性の数値化
    - 三菱地所ケイパビリティ活用度の定量化
    - 市場参入時期（3年以内）の評価
    - スコアリング結果のリアルタイム更新
    - _Requirements: 3.2_

  - [ ] 6.3 最優先アイデア選定機能
    - 最低品質スコア7.0以上からの選定アルゴリズム
    - ケイパビリティ活用シナリオの説得力評価
    - 選定根拠の明確化機能
    - 選定結果のSupabaseへの保存
    - _Requirements: 3.3_

- [ ] 7. 調査計画エージェントの実装（Next.js App Router API Routes + Supabase）
  - [ ] 7.1 詳細調査計画策定機能
    - app/api/agents/research-planning/route.tsの作成
    - lib/agents/research-planning-agent.tsの実装
    - 選定アイデアに基づく包括的調査計画の作成
    - 調査項目の体系的な整理
    - 調査計画のSupabaseへの保存
    - _Requirements: 4.1_

  - [ ] 7.2 調査項目定義機能
    - 市場規模、競合分析、技術動向、規制環境の項目定義
    - 各項目の詳細化と具体化
    - 調査データの品質基準設定
    - 調査項目のresearch_dataテーブルへの保存
    - _Requirements: 4.2_

  - [ ] 7.3 調査優先度・実行順序決定機能
    - 調査の実行順序と重要度の設定
    - リソース配分の最適化
    - 調査スケジュールの作成
    - 実行計画のSupabaseへの保存
    - _Requirements: 4.3_

- [ ] 8. 調査実行エージェントの実装（Next.js App Router API Routes + Supabase）
  - [ ] 8.1 市場規模調査機能
    - app/api/agents/research-execution/route.tsの作成
    - lib/agents/research-execution-agent.tsの実装
    - SERPER APIを活用した詳細市場規模調査
    - 市場成長率の分析機能
    - 調査結果のSupabaseへの保存
    - _Requirements: 5.1_

  - [ ] 8.2 競合分析機能
    - 主要競合他社の事業戦略分析
    - 競合他社の財務状況調査
    - 競合優位性の評価機能
    - 競合分析結果のresearch_dataテーブルへの保存
    - _Requirements: 5.2_

  - [ ] 8.3 技術・規制動向評価機能
    - 関連技術革新の影響評価
    - 規制変更の事業への影響分析
    - 技術トレンドの将来予測
    - 評価結果のSupabaseへの保存とリアルタイム更新
    - _Requirements: 5.3_

- [ ] 9. レポート生成エージェントの実装（Next.js App Router API Routes + Supabase）
  - [ ] 9.1 事業提案レポート生成機能
    - app/api/agents/report-generation/route.tsの作成
    - lib/agents/report-generation-agent.tsの実装
    - 経営層向けの構造化されたレポート生成
    - OpenAI APIを活用したエグゼクティブサマリーの自動作成
    - レポートのSupabase Storageへの保存
    - _Requirements: 6.1_

  - [ ] 9.2 7項目レポート構成要素の実装
    - 事業概要作成機能の実装
    - 想定ターゲットとその課題分析機能
    - ソリューション仮説策定機能
    - 市場規模・競合プレーヤー概要分析機能
    - 三菱地所の事業意義明確化機能
    - 検証計画策定機能
    - 事業リスク評価機能
    - 各項目結果のSupabaseへの保存
    - _Requirements: 6.2_

  - [ ] 9.3 統合レポート生成機能
    - 7項目を統合した最終レポートの生成
    - 経営層向けの読みやすい形式での出力
    - GUI表示用のJSON形式でのレポート保存
    - Supabaseへのレポートデータ保存とGUI再表示機能
    - _Requirements: 6.3_

- [ ] 10. オーケストレーションマネージャーの実装（Next.js App Router API Routes + Supabase）
  - [ ] 10.1 ワークフロー制御機能
    - app/api/workflow/start/route.tsの作成
    - lib/orchestration-manager.tsの実装
    - LangGraphを使用したエージェント実行順序制御
    - 動的なエージェント選択・実行機能
    - Supabaseでのワークフロー状態管理
    - _Requirements: 7.1, 7.3_

  - [ ] 10.2 処理状況監視機能
    - progress_trackingテーブルを使用したリアルタイム進捗追跡
    - 各エージェントの処理状況リアルタイム表示
    - 進捗状況の明確な表示機能
    - 処理時間の監視（10分制限）
    - _Requirements: 9.2, 9.3_

  - [ ] 10.3 パフォーマンス最適化機能
    - 10分以内での処理完了保証
    - 中間結果のSupabaseへの保存による処理長時間化対応
    - メモリ使用量の最適化
    - タイムアウト処理の実装
    - _Requirements: 9.1_

- [ ] 11. Next.jsフロントエンドの実装
  - [ ] 11.1 認証とメインページ
    - app/page.tsxのメインページ作成
    - app/components/AuthComponent.tsxの認証コンポーネント
    - Supabase Authを使用したログイン・ログアウト機能
    - 認証状態に基づくページ表示制御
    - _Requirements: 11.1, 11.2_

  - [ ] 11.2 入力インターフェース
    - app/components/InputForm.tsxの事業領域入力フォーム作成
    - 入力例の表示機能
    - 入力検証とフィードバック機能
    - フォーム送信時のセッション作成
    - _Requirements: 1.1, 9.2_

  - [ ] 11.3 進捗表示インターフェース
    - app/components/ProgressTracker.tsxの作成
    - useRealtimeフックを使用したリアルタイム進捗表示
    - エージェント別進捗の可視化
    - 中間結果の表示機能
    - _Requirements: 9.2, 9.3_

  - [ ] 11.4 結果表示インターフェース
    - app/components/ReportViewer.tsxの作成
    - 最終レポートのGUI上での表示機能
    - app/components/ReportHistory.tsxの履歴表示機能
    - 過去レポートの再表示機能
    - Chart.jsを使用した結果の可視化（グラフ、チャート）
    - app/hooks/useReportDisplay.tsxのレポート表示管理フック
    - _Requirements: 6.1_

- [ ] 12. テストスイートの実装（Jest + React Testing Library）
  - [ ] 12.1 ユニットテスト
    - __tests__/agents/配下に各エージェントのテスト作成
    - __tests__/components/配下にReactコンポーネントのテスト作成
    - __tests__/lib/配下にユーティリティ関数のテスト作成
    - Supabaseクライアントのモック化
    - 外部API呼び出しのモックテスト
    - _Requirements: 全要件_

  - [ ] 12.2 統合テスト
    - __tests__/integration/配下に統合テスト作成
    - エージェント間連携のテスト
    - Supabaseデータベース操作のテスト
    - リアルタイム機能のテスト
    - エラーハンドリングのテスト
    - _Requirements: 7.1, 7.2, 8.1, 8.2, 8.3_

  - [ ] 12.3 エンドツーエンドテスト（Playwright）
    - e2e/配下にE2Eテスト作成
    - 完全なワークフローのテスト
    - パフォーマンステスト（10分制限）
    - 認証フローのテスト
    - リアルタイム更新のテスト
    - _Requirements: 9.1, 11.1_

- [ ] 13. デプロイメントと設定の実装
  - [ ] 13.1 環境設定とSupabase設定
    - .env.local, .env.production等の環境変数設定
    - Supabaseプロジェクトの本番環境設定
    - Row Level Security (RLS)ポリシーの本番適用
    - 環境変数とシークレット管理
    - _Requirements: 8.1, 8.2, 11.3_

  - [ ] 13.2 Vercelデプロイメント設定
    - vercel.jsonの設定
    - Next.jsビルド設定の最適化
    - Supabaseとの連携設定
    - 環境変数のVercel設定
    - _Requirements: 全要件_

  - [ ] 13.3 モニタリングとログ設定
    - Next.jsアプリケーションのログ設定
    - Supabaseダッシュボードでのモニタリング設定
    - エラートラッキング（Sentry等）の設定
    - パフォーマンス監視の実装
    - _Requirements: 8.3, 9.1_