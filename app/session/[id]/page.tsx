'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useRealtime } from '@/app/hooks/useRealtime';
import { Database } from '@/types/database';

type Session = Database['public']['Tables']['sessions']['Row'];
type FinalReport = Database['public']['Tables']['final_reports']['Row'];

export default function SessionDetail() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  
  const [session, setSession] = useState<Session | null>(null);
  const [finalReport, setFinalReport] = useState<FinalReport | null>(null);
  const [loading, setLoading] = useState(true);
  
  const progress = useRealtime(sessionId);

  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        // セッション情報の取得
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (sessionError) throw sessionError;
        setSession(sessionData);

        // 最終レポートの取得
        const { data: reportData } = await supabase
          .from('final_reports')
          .select('*')
          .eq('session_id', sessionId)
          .single();

        if (reportData) {
          setFinalReport(reportData);
        }
      } catch (error) {
        console.error('データ取得エラー:', error);
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchSessionData();

    // リアルタイムでセッション状態を監視
    const channel = supabase
      .channel(`session:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          setSession(payload.new as Session);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'final_reports',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setFinalReport(payload.new as FinalReport);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [sessionId, router]);

  const handleBack = () => {
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={handleBack}
                className="mr-4 text-gray-500 hover:text-gray-700"
              >
                ← 戻る
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  事業提案セッション
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  {session?.user_input || '全領域調査'}
                </p>
              </div>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              session?.status === 'completed' ? 'bg-green-100 text-green-800' :
              session?.status === 'error' ? 'bg-red-100 text-red-800' :
              session?.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {session?.status === 'completed' ? '完了' :
               session?.status === 'error' ? 'エラー' :
               session?.status === 'in_progress' ? '処理中' :
               '開始'}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {session?.status === 'completed' && finalReport ? (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              事業提案レポート
            </h2>
            <div className="prose max-w-none">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(finalReport.report_content, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                処理状況
              </h2>
              <div className="space-y-4">
                {progress.length === 0 ? (
                  <p className="text-gray-500">処理を開始しています...</p>
                ) : (
                  progress.map((item) => (
                    <div key={item.id} className="border-l-4 border-blue-400 pl-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {item.agent_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {item.message}
                          </p>
                        </div>
                        <div className="flex items-center">
                          <span className="text-sm text-gray-500 mr-2">
                            {item.progress_percentage}%
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            item.status === 'completed' ? 'bg-green-100 text-green-800' :
                            item.status === 'error' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {item.status === 'completed' ? '完了' :
                             item.status === 'error' ? 'エラー' :
                             '処理中'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {session?.status === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">
                  処理中にエラーが発生しました。しばらく時間をおいて再度お試しください。
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}