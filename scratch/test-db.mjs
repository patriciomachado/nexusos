import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
console.log('URL:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseKey)
async function test() {
    const { data, error } = await supabase.from('users').select('*')
    console.log('USERS:', data, error)

    const { data: companies, error: ce } = await supabase.from('companies').select('*')
    console.log('COMPANIES:', companies, ce)
}
test()
