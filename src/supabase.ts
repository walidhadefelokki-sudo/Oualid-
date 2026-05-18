/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bwwsdwirgfzzwghlbxtc.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_vox8d8V4-Tqo8ygQZtREow_P33E1v76';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Using fallback Supabase credentials. For production, please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your Secrets panel.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type { User, Session } from '@supabase/supabase-js';
