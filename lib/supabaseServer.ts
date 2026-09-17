import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// Use the private SUPABASE_SERVICE_ROLE_KEY if available (bypasses RLS on server).
// Falls back to NEXT_PUBLIC_SUPABASE_ANON_KEY if not configured yet.
const supabaseKey = 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NODE_ENV !== 'production') {
    console.warn(
        "⚠️ [Server Supabase] SUPABASE_SERVICE_ROLE_KEY is not set in environment variables. " +
        "When Row Level Security (RLS) is enabled on the 'students' table, server auth operations " +
        "require SUPABASE_SERVICE_ROLE_KEY to bypass RLS. Please add it to your .env.local file."
    );
}

export const supabaseServer = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
});
