import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const OTHER_PERSONAL_ID = '497ed36a-7aa8-41d6-b673-06869a89e5d2';

async function checkOther() {
    const tables = ['customers', 'service_orders', 'payments'];
    console.log(`Checking data for Company: ${OTHER_PERSONAL_ID}`);
    for (const table of tables) {
        const { count } = await supabase.from(table).select('*', { count: 'exact', head: true }).eq('company_id', OTHER_PERSONAL_ID);
        console.log(`Table ${table}: ${count} records`);
    }
}
checkOther();
