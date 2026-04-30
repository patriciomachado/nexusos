import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function findUser() {
    const { data: users, error } = await supabase
        .from('users')
        .select('id, email, company_id')
        .eq('email', 'patriciojmf@gmail.com')
    
    if (error) {
        console.error(error)
        return
    }

    console.log(JSON.stringify(users, null, 2))
}

findUser()
