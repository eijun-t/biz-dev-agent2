import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey);

// サーバーサイドで使用するための関数
export function createClient() {
  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey);
}