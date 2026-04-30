import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const COMPANY_ID = '9f535935-89a1-469c-9bbb-4a13ddada5f7'

async function checkData() {
    const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', COMPANY_ID)
    
    const { count: soCount } = await supabase
        .from('service_orders')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', COMPANY_ID)

    console.log(`Company ${COMPANY_ID} has:`)
    console.log(`- Customers: ${customerCount}`)
    console.log(`- Service Orders: ${soCount}`)
}

checkData()
