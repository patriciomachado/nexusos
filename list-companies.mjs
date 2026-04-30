import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function list() {
  const { data, error } = await supabase.from('companies').select('id, name')
  if (error) console.error(error)
  else data.forEach(c => console.log(`${c.id}: ${c.name}`))
}
list()
