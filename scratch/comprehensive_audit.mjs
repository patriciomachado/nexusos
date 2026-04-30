import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkEverywhere() {
    const { data: companies } = await supabase.from('companies').select('id, name');
    console.log("--- Comprehensive Data Audit ---");
    for (const company of companies || []) {
        const { count: customers } = await supabase.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', company.id);
        const { count: orders } = await supabase.from('service_orders').select('*', { count: 'exact', head: true }).eq('company_id', company.id);
        const { count: payments } = await supabase.from('payments').select('*', { count: 'exact', head: true }).eq('company_id', company.id);
        
        if (customers > 0 || orders > 0 || payments > 0) {
            console.log(`Company: ${company.name} (${company.id})`);
            console.log(`- Customers: ${customers}`);
            console.log(`- Orders: ${orders}`);
            console.log(`- Payments: ${payments}`);
            console.log("----------------------------");
        }
    }
    
    const { count: nullCust } = await supabase.from('customers').select('*', { count: 'exact', head: true }).is('company_id', null);
    const { count: nullOrders } = await supabase.from('service_orders').select('*', { count: 'exact', head: true }).is('company_id', null);
    if (nullCust > 0 || nullOrders > 0) {
        console.log(`ORPHANED DATA: Customers: ${nullCust}, Orders: ${nullOrders}`);
    }
}
checkEverywhere();
