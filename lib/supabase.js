import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client using the service role key. All access is gated
// by our own JWT auth in the API routes, so we use the privileged key and skip
// row-level security. NEVER expose the service role key to the browser.
let client;

export function getSupabase() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
