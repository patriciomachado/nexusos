import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function getColumns() {
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'service_orders' })
    if (error) {
        console.log('RPC failed, trying query...')
        // Fallback: select one record to see keys
        const { data: sample, error: err2 } = await supabase.from('service_orders').select('*').limit(1).single()
        if (err2) {
            console.error(err2)
            return
        }
        console.log('Columns found in sample:', Object.keys(sample))
    } else {
        console.log('Columns:', data)
    }
}

getColumns()
