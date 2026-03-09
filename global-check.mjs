import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGlobalPayments() {
    console.log('--- Global Payments Check ---');
    const { count, error } = await supabase.from('payments').select('*', { count: 'exact', head: true });
    if (error) console.error(error);
    else console.log('Total payments in database:', count);

    if (count > 0) {
        const { data: samples } = await supabase.from('payments').select('id, company_id, amount').limit(10);
        console.log('Sample payments:', samples);
    }
}

checkGlobalPayments();
