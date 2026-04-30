import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data, error } = await supabase.from('customers').select('company_id').limit(10000);
    if (error) {
        console.error(error);
        return;
    }
    const counts = {};
    data.forEach(r => {
        counts[r.company_id] = (counts[r.company_id] || 0) + 1;
    });
    console.log('Customer counts by company_id:', counts);
}

run();
