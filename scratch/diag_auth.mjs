import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const email = 'drivermindapp@gmail.com';
  console.log(`Checking user: ${email}`);
  
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
    
  if (userError) {
    console.error('User error:', userError);
  } else {
    console.log('User found:', user);
    
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', user.company_id)
      .single();
      
    if (companyError) {
      console.error('Company error:', companyError);
    } else {
      console.log('Company found:', company);
    }
  }
}

check();
