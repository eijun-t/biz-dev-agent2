// サーバーサイド用Supabaseクライアント
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// サーバーサイドでサービスロールキーを使用
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // サービスロールキーが利用可能な場合は使用（RLSをバイパス）
  const key = supabaseServiceRole || supabaseAnonKey;
  
  return createSupabaseClient<Database>(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}