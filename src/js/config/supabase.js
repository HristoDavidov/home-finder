import { createClient } from "@supabase/supabase-js";
import { ENV } from "./env.js";

export const supabaseClient = ENV.SUPABASE_URL && ENV.SUPABASE_ANON_KEY
  ? createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY)
  : null;
