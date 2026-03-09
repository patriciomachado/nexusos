import { createAdminClient } from './lib/supabase.js';

async function checkData() {
    const db = createAdminClient();
    const companyId = '9f535935-89a1-469c-9bbb-4a13ddada5f7';

    console.log('Checking data for company:', companyId);

    const { data: payments } = await db.from('payments')
        .select('*')
        .eq('company_id', companyId);

    console.log('Total payments:', payments?.length);
    console.log('Payments:', JSON.stringify(payments, null, 2));

    const { data: serviceOrders } = await db.from('service_orders')
        .select('*')
        .eq('company_id', companyId);

    console.log('Total service orders:', serviceOrders?.length);
    if (serviceOrders) {
        console.log('OS Statuses:', serviceOrders.map(os => os.status));
    }
}

checkData();
