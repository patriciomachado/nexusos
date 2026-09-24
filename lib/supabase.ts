import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Created on first use, not when the module loads: `next build` imports every
// route to collect its config, and must not fail in an environment (e.g. a
// Vercel Preview) where the Supabase variables aren't set.
let client: SupabaseClient | null = null
export const supabase = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        client ??= createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: false, // Clerk handles sessions
            },
        })
        const value = Reflect.get(client, prop, client)
        return typeof value === 'function' ? value.bind(client) : value
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
