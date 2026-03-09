
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugDashboard() {
    console.log('--- Debugging Dashboard Content ---')

    // 1. Check current user
    // This script runs outside of Clerk context, so we just check the tables

    const { data: companies, error: compErr } = await supabase.from('companies').select('*').limit(1)
    if (compErr) console.error('Error fetching companies:', compErr)
    console.log('Companies found:', companies?.length || 0)

    if (companies && companies.length > 0) {
        const cid = companies[0].id
        console.log(`Checking company: ${companies[0].name} (${cid})`)

        const { count: osCount } = await supabase.from('service_orders').select('*', { count: 'exact', head: true }).eq('company_id', cid)
        console.log('Total Service Orders:', osCount)

        const { count: custCount } = await supabase.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', cid)
        console.log('Total Customers:', custCount)

        const { count: techCount } = await supabase.from('technicians').select('*', { count: 'exact', head: true }).eq('company_id', cid)
        console.log('Total Technicians:', techCount)

        const { data: payments } = await supabase.from('payments').select('amount, payment_status, payment_date').eq('company_id', cid)
        console.log('Total Payments Records:', payments?.length || 0)
        console.log('Sample Payments:', payments?.slice(0, 3))

        const { data: users } = await supabase.from('users').select('*').eq('company_id', cid)
        console.log('Users found for this company:', users?.length || 0)
        if (users) {
            console.log('Roles found:', [...new Set(users.map(u => u.role))])
        }
    } else {
        console.log('No companies found in database.')
    }
}

debugDashboard()
