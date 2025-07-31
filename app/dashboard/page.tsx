'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
type Session = Database['public']['Tables']['sessions']['Row'];

export default function Dashboard() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        console.log('Current user:', user);
        
        if (!user) {
          router.push('/login');
          return;
        }

        // ユーザープロフィールの取得
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        console.log('Profile result:', { profile, profileError });

        if (profileError && profileError.code === 'PGRST116') {
          // プロフィールが存在しない場合は作成
          const { data: newProfile } = await supabase
            .from('user_profiles')
            .insert({
              id: user.id,
              name: user.email?.split('@')[0] || 'ユーザー',
              department: '新事業開発部門'
            })
            .select()
            .single();
          
          if (newProfile) {
            setUserProfile(newProfile);
          }
        } else if (profile) {
          setUserProfile(profile);
        }

        // セッション履歴の取得
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        console.log('Sessions result:', { sessionData, sessionError });

        if (sessionData) {
          setSessions(sessionData);
        }
      } catch (error) {
        console.error('データ取得エラー:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleNewSession = () => {
    router.push('/session/new');
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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                ビジネス提案エージェント
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {userProfile?.name}さん、こんにちは
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <button
            onClick={handleNewSession}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            新しい事業提案を開始
          </button>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              過去の事業提案
            </h2>
            
            {sessions.length === 0 ? (
              <p className="text-gray-500">まだ事業提案の履歴がありません。</p>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/session/${session.id}`)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {session.user_input || 'カスタム調査なし（全領域調査）'}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(session.created_at).toLocaleString('ja-JP')}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        session.status === 'completed' ? 'bg-green-100 text-green-800' :
                        session.status === 'error' ? 'bg-red-100 text-red-800' :
                        session.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {session.status === 'completed' ? '完了' :
                         session.status === 'error' ? 'エラー' :
                         session.status === 'in_progress' ? '処理中' :
                         '開始'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}