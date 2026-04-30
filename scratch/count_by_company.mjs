import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('--- Stats by Company ---');
    
    const { data: companies } = await supabase.from('companies').select('id, name');
    
    for (const company of companies) {
        const { count: custCount } = await supabase.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', company.id);
        const { count: osCount } = await supabase.from('service_orders').select('*', { count: 'exact', head: true }).eq('company_id', company.id);
        console.log(`Company: ${company.name} (${company.id})`);
        console.log(`  Customers: ${custCount}`);
        console.log(`  Service Orders: ${osCount}`);
    }
}

run();
