/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://supabase.com/dashboard/project/nyengmsybdsgjalqejxz';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1V3YwQmaIZrod7_AdfiiwQ_6MnErABe';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type { User, Session } from '@supabase/supabase-js';
