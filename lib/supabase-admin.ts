import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Server-only — uses the service role key, bypasses RLS.
// Never import this in client components.
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
