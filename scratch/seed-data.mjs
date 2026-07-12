import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedFunctionalData() {
    const companyId = '9f535935-89a1-469c-9bbb-4a13ddada5f7';
    console.log('--- Seeding Functional Data for Company:', companyId, '---');

    const { data: technicians } = await supabase.from('technicians').select('id').eq('company_id', companyId).limit(1);
    const techId = technicians?.[0]?.id;

    const { data: customers } = await supabase.from('customers').select('id').eq('company_id', companyId).limit(1);
    const custId = customers?.[0]?.id;

    if (!techId || !custId) {
        console.error('Missing technician or customer.');
        return;
    }

    const now = new Date();

    // Seed OS with correct order_number
    const osData = [
        { title: 'Manutenção Preventiva - Servidor Dell', cost: 450, num: 'OS-00003' },
        { title: 'Troca de Display iPhone 13', cost: 1200, num: 'OS-00004' },
        { title: 'Reparo em Placa Mãe ASUS', cost: 850, num: 'OS-00005' }
    ];

    for (let i = 0; i < osData.length; i++) {
        const { data: newOS, error: osError } = await supabase.from('service_orders').insert({
            company_id: companyId,
            customer_id: custId,
            technician_id: techId,
            title: osData[i].title,
            order_number: osData[i].num,
            status: 'faturada',
            estimated_cost: osData[i].cost,
            final_cost: osData[i].cost,
            equipment_description: 'Equipamento ' + (i + 3),
            created_at: new Date(now.getTime() - (i * 2 + 1) * 24 * 60 * 60 * 1000).toISOString()
        }).select().single();

        if (osError) {
            console.error('Error seeding OS:', osError.message);
            continue;
        }

        // Try 'dinheiro' or similar based on common PT usage if 'credit_card' failed
        const { error: payError } = await supabase.from('payments').insert({
            company_id: companyId,
            service_order_id: newOS.id,
            amount: osData[i].cost,
            payment_status: 'completed',
            payment_method: 'dinheiro', // Trying Portuguese
            payment_date: new Date(now.getTime() - (i * 2) * 24 * 60 * 60 * 1000).toISOString()
        });

        if (payError) console.error('Error seeding payment:', payError.message);
    }

    // Seed previous month for trends
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 15);
    await supabase.from('payments').insert([
        { company_id: companyId, amount: 2000, payment_status: 'completed', payment_method: 'dinheiro', payment_date: prevMonthDate.toISOString() },
        { company_id: companyId, amount: 1500, payment_status: 'completed', payment_method: 'dinheiro', payment_date: new Date(prevMonthDate.getTime() + 86400000).toISOString() }
    ]);

    console.log('Seeding attempt finished.');
}

seedFunctionalData();
