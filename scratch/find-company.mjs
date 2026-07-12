import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findFunctionalCompany() {
    console.log('--- Searching for a company with functional data ---');

    const { data: companies } = await supabase.from('companies').select('id, name');
    console.log('Total companies:', companies?.length);

    for (const company of companies || []) {
        const { count: paymentsCount } = await supabase
            .from('payments')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id);

        const { count: osCount } = await supabase
            .from('service_orders')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id);

        const { count: customersCount } = await supabase
            .from('customers')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id);

        console.log(`Company: ${company.name} (${company.id})`);
        console.log(`- Payments: ${paymentsCount}`);
        console.log(`- Service Orders: ${osCount}`);
        console.log(`- Customers: ${customersCount}`);

        if (paymentsCount > 0 && osCount > 0 && customersCount > 0) {
            console.log('>>> THIS COMPANY IS FUNCTIONAL! <<<');
        }
        console.log('-----------------------------------');
    }
}

findFunctionalCompany();
