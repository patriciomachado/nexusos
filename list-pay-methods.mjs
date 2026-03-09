import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listPaymentMethods() {
    console.log('--- Listing Payment Methods ---');
    const { data, error } = await supabase.from('payment_methods').select('*');
    if (error) console.error(error);
    else console.log(data);
}

listPaymentMethods();
