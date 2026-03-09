import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPayments() {
    const companyId = '9f535935-89a1-469c-9bbb-4a13ddada5f7';
    console.log('--- Checking Payments for Company:', companyId, '---');

    const { data: payments, error } = await supabase
        .from('payments')
        .select('*')
        .eq('company_id', companyId);

    if (error) {
        console.error('Error fetching payments:', error);
        return;
    }

    console.log('Total payments found:', payments.length);
    if (payments.length > 0) {
        console.log('Sample payments (first 5):');
        payments.slice(0, 5).forEach(p => {
            console.log(`- ID: ${p.id}, Amount: ${p.amount}, Date: ${p.payment_date}, Status: ${p.payment_status}`);
        });

        const completed = payments.filter(p => p.payment_status === 'completed');
        console.log('Total completed payments:', completed.length);

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const currentMonth = completed.filter(p => p.payment_date >= startOfMonth);
        console.log('Completed payments this month (>= ' + startOfMonth + '):', currentMonth.length);

        const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        const prevMonth = completed.filter(p => p.payment_date >= startOfPrevMonth && p.payment_date < startOfMonth);
        console.log('Completed payments prev month:', prevMonth.length);
    }

    console.log('\n--- Checking Service Orders ---');
    const { data: os, error: osError } = await supabase
        .from('service_orders')
        .select('id, status, final_cost, estimated_cost')
        .eq('company_id', companyId);

    if (osError) console.error(osError);
    else {
        console.log('Total OS:', os.length);
        const concluded = os.filter(o => o.status === 'concluida' || o.status === 'faturada');
        console.log('Concluded OS:', concluded.length);
        concluded.forEach(o => {
            console.log(`- OS ID: ${o.id}, Status: ${o.status}, Final Cost: ${o.final_cost}, Est Cost: ${o.estimated_cost}`);
        });
    }
}

checkPayments();
