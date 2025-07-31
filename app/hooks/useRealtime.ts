'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type ProgressTracking = Database['public']['Tables']['progress_tracking']['Row'];

export function useRealtime(sessionId: string | null) {
  const [progress, setProgress] = useState<ProgressTracking[]>([]);

  useEffect(() => {
    if (!sessionId) return;

    // 既存の進捗を取得
    const fetchProgress = async () => {
      const { data, error } = await supabase
        .from('progress_tracking')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (data && !error) {
        setProgress(data);
      }
    };

    fetchProgress();

    // リアルタイム更新を購読
    const channel = supabase
      .channel(`progress_tracking:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'progress_tracking',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setProgress(prev => [...prev, payload.new as ProgressTracking]);
          } else if (payload.eventType === 'UPDATE') {
            setProgress(prev => 
              prev.map(p => 
                p.id === payload.new.id ? payload.new as ProgressTracking : p
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [sessionId]);

  return progress;
}