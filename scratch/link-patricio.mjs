
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const PATRICIO_CLERK_ID = 'user_3AdsSgjuEYfGCALOJSWCAAOG57w'
const TARGET_COMPANY_ID = '9f535935-89a1-469c-9bbb-4a13ddada5f7' // Nexus Premium

async function updateAccount() {
    console.log('--- LINKING PATRICIO TO REAL DATA ---')
    const { data, error } = await supabase
        .from('users')
        .update({ company_id: TARGET_COMPANY_ID })
        .eq('clerk_id', PATRICIO_CLERK_ID)
        .select()

    if (error) {
        console.error('Error updating user:', error.message)
    } else {
        console.log('Account linked successfully:', data[0].full_name, '->', data[0].company_id)
    }
}
updateAccount()
