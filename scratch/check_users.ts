
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkUsers() {
    const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role, clerk_id')
    
    if (error) {
        console.error('Error fetching users:', error)
        return
    }

    console.log('Users in Database:')
    console.table(data)
}

checkUsers()
