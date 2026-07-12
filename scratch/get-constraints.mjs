import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function getCheckConstraints() {
    console.log('--- Fetching Check Constraints ---');

    const { data, error } = await supabase.rpc('get_check_constraints', { table_name: 'payments' });

    if (error) {
        // Fallback: search for existing payments in other companies to see their methods
        console.log('RPC failed, searching for sample payment methods across all companies...');
        const { data: samples } = await supabase.from('payments').select('payment_method').limit(10);
        console.log('Found payment methods:', [...new Set(samples?.map(s => s.payment_method))]);
    } else {
        console.log('Constraints:', data);
    }
}

getCheckConstraints();
