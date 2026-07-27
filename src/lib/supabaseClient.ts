import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zrlcibersabcdobffvcx.supabase.co";
const SUPABASE_KEY = "sb_publishable__AmbfXLnrNZnCCFRQh3SyQ_2vKQfSsf";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
  db: { schema: "public" },
});
