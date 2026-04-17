import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

// Browser / client-component client — uses the anon key, respects RLS.
// Must use createBrowserClient (not createClient) so session cookies are written
// in the format that the middleware's createServerClient can read.
export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
