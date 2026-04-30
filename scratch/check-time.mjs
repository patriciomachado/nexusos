import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTime() {
    console.log('Checking database time settings...')
    
    // Check current time in DB
    const { data: timeData, error: timeError } = await supabase.rpc('get_current_time_info')
    if (timeError) {
        // Fallback if RPC doesn't exist
        const { data: rawTime, error: rawError } = await supabase.from('service_orders').select('created_at').limit(1)
        console.log('Raw created_at from an OS:', rawTime?.[0]?.created_at)
    } else {
        console.log('DB Time Info:', timeData)
    }

    // Check most recent OS
    const { data: recentOS, error: osError } = await supabase
        .from('service_orders')
        .select('id, created_at, order_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    if (osError) {
        console.error('Error fetching recent OS:', osError)
    } else {
        console.log('Most recent OS:', recentOS)
        const date = new Date(recentOS.created_at)
        console.log('Parsed Date (Local):', date.toString())
        console.log('Parsed Date (ISO):', date.toISOString())
    }
}

checkTime()
