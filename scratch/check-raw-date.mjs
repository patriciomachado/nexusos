import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
    const { data, error } = await supabase
        .from('service_orders')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    if (error) {
        console.error(error)
        return
    }

    console.log('Raw created_at from Supabase:', data.created_at)
    console.log('Type of created_at:', typeof data.created_at)
    
    const d = new Date(data.created_at)
    console.log('new Date(created_at) string:', d.toString())
    console.log('new Date(created_at) ISO:', d.toISOString())
}

test()
