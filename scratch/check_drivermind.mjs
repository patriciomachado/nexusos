import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkUser() {
  const email = 'drivermindapp@gmail.com'
  console.log(`Checking user: ${email}`)
  
  const { data: user, error } = await supabase
    .from('users')
    .select('*, companies(*)')
    .ilike('email', email)
    .single()
    
  if (error) {
    console.error('Error finding user:', error)
  } else {
    console.log('User found:', JSON.stringify(user, null, 2))
  }
}

checkUser()
