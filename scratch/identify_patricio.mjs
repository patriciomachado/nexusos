import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function findUser() {
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'patriciojmf@gmail.com')
    
    if (error) {
        console.error('Error fetching profiles:', error)
        return
    }

    console.log('Profiles found:', users)

    const { data: companies, error: cError } = await supabase
        .from('companies')
        .select('*')
    
    if (cError) {
        console.error('Error fetching companies:', cError)
    } else {
        console.log('All Companies:', companies)
    }
}

findUser()
