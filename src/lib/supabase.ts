import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zrlcibersabcdobffvcx.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable__AmbfXLnrNZnCCFRQh3SyQ_2vKQfSsf';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
