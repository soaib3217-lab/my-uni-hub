import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawKey = 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!rawUrl || !rawKey) {
    console.error(
        "⚠️ [Server Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_KEY in environment variables! " +
        "Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) are configured in Netlify Site Settings."
    );
}

const supabaseUrl = rawUrl && rawUrl.startsWith("http") ? rawUrl : "https://placeholder-project.supabase.co";
const supabaseKey = rawKey && rawKey.length > 5 ? rawKey : "placeholder-anon-key-prevent-import-crash";

export const supabaseServer: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
});
