
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const PATRICIO_COMPANY = '497ed36a-7aa8-41d6-b673-06869a89e5d2'

async function check() {
    const tables = ['service_orders', 'customers', 'technicians', 'payments', 'inventory_items']
    console.log(`--- DATA FOR COMPANY: ${PATRICIO_COMPANY} ---`)
    for (const t of tables) {
        const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true }).eq('company_id', PATRICIO_COMPANY)
        if (error) console.error(error)
        else console.log(`${t}: ${count} records`)
    }
}
check()
