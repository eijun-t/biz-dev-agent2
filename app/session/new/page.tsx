'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function NewSession() {
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      // セッションを作成
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          user_input: userInput || null,
          status: 'started'
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // ワークフロー開始APIを呼び出す
      const response = await fetch('/api/workflow/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: session.id,
          user_input: userInput || null
        }),
      });

      if (!response.ok) {
        throw new Error('ワークフローの開始に失敗しました');
      }

      // セッション詳細ページへ遷移
      router.push(`/session/${session.id}`);
    } catch (error: any) {
      console.error('セッション開始エラー:', error);
      setError(error.message || 'セッションの開始に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center">
            <button
              onClick={handleBack}
              className="mr-4 text-gray-500 hover:text-gray-700"
            >
              ← 戻る
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              新しい事業提案を開始
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <form onSubmit={handleStartSession} className="space-y-6">
            <div>
              <label htmlFor="userInput" className="block text-sm font-medium text-gray-700 mb-2">
                調査したい事業領域（オプション）
              </label>
              <textarea
                id="userInput"
                rows={4}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="例：不動産×ヘルスケア、スマートシティ関連、サステナビリティ事業など"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
              />
              <p className="mt-2 text-sm text-gray-500">
                ※ 空欄の場合は、12カテゴリ全領域の調査を行います
              </p>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '処理中...' : '調査を開始'}
              </button>
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                キャンセル
              </button>
            </div>
          </form>

          <div className="mt-8 border-t pt-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">調査の流れ</h2>
            <ol className="space-y-3 text-sm text-gray-600">
              <li className="flex">
                <span className="font-medium mr-2">1.</span>
                <span>市場・技術トレンド情報の収集</span>
              </li>
              <li className="flex">
                <span className="font-medium mr-2">2.</span>
                <span>5つのビジネスアイデアを生成</span>
              </li>
              <li className="flex">
                <span className="font-medium mr-2">3.</span>
                <span>アイデアの評価と最優先案の選定</span>
              </li>
              <li className="flex">
                <span className="font-medium mr-2">4.</span>
                <span>詳細な市場調査と分析</span>
              </li>
              <li className="flex">
                <span className="font-medium mr-2">5.</span>
                <span>事業提案レポートの生成</span>
              </li>
            </ol>
            <p className="mt-4 text-sm text-gray-500">
              ※ 処理には約15分かかります
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}