import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const PERSONAL_COMPANY_ID = '9f535935-89a1-469c-9bbb-4a13ddada5f7';

async function checkAllTables() {
    const tables = ['customers', 'service_orders', 'payments', 'devices', 'inventory', 'users', 'suppliers'];
    console.log(`Checking data for Company: ${PERSONAL_COMPANY_ID}`);
    for (const table of tables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true }).eq('company_id', PERSONAL_COMPANY_ID);
        if (error) {
            console.log(`Table ${table}: Error ${error.message}`);
        } else {
            console.log(`Table ${table}: ${count} records`);
        }
    }
}
checkAllTables();
