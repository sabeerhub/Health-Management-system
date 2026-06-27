// ==========================================================================
// FUD HEALTH HMS — SUPABASE CLIENT (singleton)
// Uses the official ESM build from Supabase's CDN — no bundler required,
// matching the "vanilla JS / ES6 modules" requirement.
// ==========================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js?v2";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
