
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const COMPANY_ID = '9f535935-89a1-469c-9bbb-4a13ddada5f7';

async function checkData() {
    const { count: osCount } = await supabase
        .from('service_orders')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', COMPANY_ID);

    const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', COMPANY_ID);

    const { data: transactions } = await supabase
        .from('cash_transactions')
        .select('amount, type')
        .eq('company_id', COMPANY_ID); // Wait, cash_transactions might not have company_id directly?

    console.log(`OS Count: ${osCount}`);
    console.log(`Customer Count: ${customerCount}`);
    console.log(`Transactions: ${transactions?.length || 0}`);
}

checkData();
