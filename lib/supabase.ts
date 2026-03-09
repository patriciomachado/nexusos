import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false, // Clerk handles sessions
    },
})

// Server-side admin client (only for API routes)
export const createAdminClient = () => {
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseServiceKey) {
        // Fall back to anon key if service key not available
        return createClient(supabaseUrl, supabaseAnonKey)
    }
    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            persistSession: false,
        },
    })
}
