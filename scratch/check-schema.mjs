import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('--- Checking Schema Constraints ---');

    // Check existing OS to see order_number format
    const { data: os } = await supabase.from('service_orders').select('order_number').limit(5);
    console.log('Sample OS Order Numbers:', os);

    // Check payments to see if we can get an error that explains the check constraint
    const { error: payError } = await supabase.from('payments').insert({
        company_id: '9f535935-89a1-469c-9bbb-4a13ddada5f7',
        amount: 10,
        payment_method: 'invalid_method',
        payment_status: 'completed'
    });
    console.log('Triggered Payment Error:', payError?.message);
}

checkSchema();
