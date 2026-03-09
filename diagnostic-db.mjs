
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function diagnostic() {
    const tables = ['users', 'companies', 'service_orders', 'customers', 'technicians', 'payments', 'inventory_items']
    console.log('--- GLOBAL DATABASE DIAGNOSTIC ---')
    for (const t of tables) {
        try {
            const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true })
            if (error) {
                console.error(`Error in ${t}:`, error.message)
            } else {
                console.log(`${t}: ${count} records`)
                if (count > 0) {
                    const { data } = await supabase.from(t).select('*').limit(1)
                    console.log(`  Sample ${t}:`, JSON.stringify(data[0], null, 2))
                }
            }
        } catch (e) {
            console.error(`Failed to check ${t}:`, e)
        }
    }
}

diagnostic()
