import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkDuplicates() {
  const email = 'drivermindapp@gmail.com'
  console.log(`Checking duplicates for: ${email}`)
  
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .ilike('email', email)
    
  if (error) {
    console.error('Error:', error)
  } else {
    console.log(`Found ${users.length} users with this email.`)
    console.log(JSON.stringify(users, null, 2))
  }
}

checkDuplicates()
