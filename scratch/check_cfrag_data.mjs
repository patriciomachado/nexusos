import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

const CFRAG_COMPANY_ID = '7d9ba9af-8410-4a1a-b43e-fbe66ff6c56a';

async function run() {
    console.log('--- Customers for Cfrag ---');
    const { data, error } = await supabase.from('customers').select('*').eq('company_id', CFRAG_COMPANY_ID).limit(10);
    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
}

run();
