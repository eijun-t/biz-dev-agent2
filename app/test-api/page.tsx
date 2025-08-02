'use client';

import { useState } from 'react';
import { ErrorDisplay } from '@/app/components/ErrorDisplay';
import { notFound } from 'next/navigation';

// 本番環境ではアクセスを制限
if (process.env.NODE_ENV === 'production') {
  notFound();
}

type TestType = 'openai-generate' | 'openai-analyze' | 'serper-search' | 'error-test';

interface TestResult {
  success: boolean;
  data?: any;
  error?: any;
  duration?: number;
}

export default function TestAPIPage() {
  const [testType, setTestType] = useState<TestType>('openai-generate');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  // OpenAI Generate テスト
  const testOpenAIGenerate = async () => {
    const startTime = Date.now();
    try {
      const response = await fetch('/api/openai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: '三菱地所の新事業として、不動産×テクノロジーの分野で可能性のあるビジネスアイデアを1つ提案してください。',
          systemPrompt: 'あなたは三菱地所の新事業開発担当者です。簡潔に答えてください。',
          temperature: 0.8,
          maxTokens: 500,
        }),
      });

      const data = await response.json();
      setResult({
        ...data,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      setResult({
        success: false,
        error: {
          type: 'system',
          message: (error as Error).message,
          details: error,
        },
        duration: Date.now() - startTime,
      });
    }
  };

  // OpenAI Analyze テスト
  const testOpenAIAnalyze = async () => {
    const startTime = Date.now();
    try {
      const response = await fetch('/api/openai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            market_size: '1000億円',
            growth_rate: '年15%',
            competitors: ['企業A', '企業B', '企業C'],
            opportunities: ['DX需要の拡大', 'リモートワークの定着', 'ESG投資の増加'],
          },
          analysisPrompt: 'この市場データを分析し、三菱地所が参入する際の強みと課題を3つずつ挙げてください。',
          temperature: 0.7,
          maxTokens: 1000,
        }),
      });

      const data = await response.json();
      setResult({
        ...data,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      setResult({
        success: false,
        error: {
          type: 'system',
          message: (error as Error).message,
          details: error,
        },
        duration: Date.now() - startTime,
      });
    }
  };

  // SERPER Search テスト
  const testSerperSearch = async () => {
    const startTime = Date.now();
    try {
      const response = await fetch('/api/serper/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: '不動産テック PropTech 最新トレンド 2024',
          num: 5,
          lang: 'ja',
        }),
      });

      const data = await response.json();
      setResult({
        ...data,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      setResult({
        success: false,
        error: {
          type: 'system',
          message: (error as Error).message,
          details: error,
        },
        duration: Date.now() - startTime,
      });
    }
  };

  // エラーハンドリングテスト
  const testErrorHandling = async () => {
    const startTime = Date.now();
    try {
      // 意図的に無効なリクエストを送信
      const response = await fetch('/api/openai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // promptを意図的に省略
          systemPrompt: 'テスト',
        }),
      });

      const data = await response.json();
      setResult({
        ...data,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      setResult({
        success: false,
        error: {
          type: 'system',
          message: (error as Error).message,
          details: error,
        },
        duration: Date.now() - startTime,
      });
    }
  };

  const runTest = async () => {
    setLoading(true);
    setResult(null);

    switch (testType) {
      case 'openai-generate':
        await testOpenAIGenerate();
        break;
      case 'openai-analyze':
        await testOpenAIAnalyze();
        break;
      case 'serper-search':
        await testSerperSearch();
        break;
      case 'error-test':
        await testErrorHandling();
        break;
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Task 3 API テストページ
        </h1>

        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">テストタイプを選択</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <button
              onClick={() => setTestType('openai-generate')}
              className={`p-3 rounded-md border ${
                testType === 'openai-generate'
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              OpenAI Generate
            </button>
            <button
              onClick={() => setTestType('openai-analyze')}
              className={`p-3 rounded-md border ${
                testType === 'openai-analyze'
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              OpenAI Analyze
            </button>
            <button
              onClick={() => setTestType('serper-search')}
              className={`p-3 rounded-md border ${
                testType === 'serper-search'
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              SERPER Search
            </button>
            <button
              onClick={() => setTestType('error-test')}
              className={`p-3 rounded-md border ${
                testType === 'error-test'
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              エラーテスト
            </button>
          </div>

          <div className="mb-6 p-4 bg-gray-50 rounded-md">
            <h3 className="font-medium mb-2">テスト内容:</h3>
            <p className="text-sm text-gray-600">
              {testType === 'openai-generate' && 'OpenAI APIを使用してテキスト生成をテストします。'}
              {testType === 'openai-analyze' && 'OpenAI APIを使用してデータ分析（JSON形式）をテストします。'}
              {testType === 'serper-search' && 'SERPER APIを使用してWeb検索をテストします。'}
              {testType === 'error-test' && 'エラーハンドリングが正しく動作するかテストします。'}
            </p>
          </div>

          <button
            onClick={runTest}
            disabled={loading}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'テスト実行中...' : 'テストを実行'}
          </button>
        </div>

        {result && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">テスト結果</h2>
            
            {result.duration && (
              <p className="text-sm text-gray-600 mb-4">
                実行時間: {result.duration}ms
              </p>
            )}

            {result.success === false && result.error && (
              <ErrorDisplay
                error={{
                  type: result.error.code === 'API_ERROR' ? 'api' : 
                        result.error.code === 'DATA_QUALITY_ERROR' ? 'data_quality' :
                        result.error.code === 'TIMEOUT_ERROR' ? 'timeout' : 'system',
                  message: result.error.message,
                  code: result.error.code,
                  details: result.error.details,
                  statusCode: result.error.statusCode,
                  canRetry: true,
                }}
                onRetry={runTest}
              />
            )}

            {result.success && (
              <div>
                <div className="mb-2 text-green-600 font-medium">
                  ✓ テスト成功
                </div>
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700">
                    レスポンスデータを表示
                  </summary>
                  <pre className="mt-2 p-4 bg-gray-50 rounded-md overflow-x-auto text-xs">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </details>
              </div>
            )}

            {result.success === undefined && (
              <pre className="p-4 bg-gray-50 rounded-md overflow-x-auto text-xs">
                {JSON.stringify(result, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}