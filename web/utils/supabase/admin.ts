import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Admin client using the SERVICE ROLE KEY.
 * Bypasses RLS — use ONLY for internal server-side writes (e.g. AI generation saves).
 * Never expose this to the client.
 */
export function createAdminClient() {
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}
