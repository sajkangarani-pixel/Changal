import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = "https://xpfjgadangiixrmzdndi.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_cKhC8A3Ze2nkDRSzf400Dg_HXDq5Ns2";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
