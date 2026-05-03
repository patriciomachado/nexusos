
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const db = createClient(supabaseUrl, supabaseKey);

async function testDashboardData(companyId) {
    const now = new Date()

    // Date ranges
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)).toISOString()

    console.log('Testing dashboard data for company:', companyId)

    try {
        console.log('Running queries...');
        const [
            totalOS,
            openOSData,
            todayOS,
            recentOS,
            currentPayments,
            totalCustomers,
            inventoryAlerts,
            salesMonth,
            osMonthData,
            expensesMonth,
            chartSales,
            chartOS
        ] = await Promise.all([
            db.from('service_orders').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
            db.from('service_orders').select('estimated_cost, final_cost, status').eq('company_id', companyId).in('status', ['aberta', 'agendada', 'em_andamento', 'aguardando_pecas']),
            db.from('service_orders').select('*', { count: 'exact', head: true }).eq('company_id', companyId).gte('created_at', startOfToday.toISOString()),
            db.from('service_orders').select('*, customers(name, company_name), technicians(name)').eq('company_id', companyId).order('created_at', { ascending: false }).limit(6),
            db.from('payments').select('amount, payment_date').eq('company_id', companyId).eq('payment_status', 'completed').gte('payment_date', startOfMonth),
            db.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true),
            db.from('inventory_items').select('id, name, quantity_in_stock, minimum_quantity').eq('company_id', companyId).filter('quantity_in_stock', 'lte', 'minimum_quantity').limit(4),
            db.from('sales').select('final_amount, sale_items(quantity, product:inventory_items(cost_price))').eq('company_id', companyId).eq('status', 'completed').gte('created_at', startOfMonth),
            db.from('service_orders').select('final_cost, parts_cost').eq('company_id', companyId).in('status', ['concluida', 'faturada']).gte('completed_at', startOfMonth),
            db.from('cash_transactions').select('amount').eq('type', 'exit').gte('created_at', startOfMonth),
            db.from('sales').select('final_amount, created_at, sale_items(quantity, product:inventory_items(cost_price))').eq('company_id', companyId).eq('status', 'completed').gte('created_at', sevenDaysAgo),
            db.from('service_orders').select('final_cost, parts_cost, completed_at').eq('company_id', companyId).in('status', ['concluida', 'faturada']).gte('completed_at', sevenDaysAgo)
        ])

        console.log('Queries completed.');
        
        const results = {
            totalOS, openOSData, todayOS, recentOS, currentPayments,
            totalCustomers, inventoryAlerts, salesMonth, osMonthData,
            expensesMonth, chartSales, chartOS
        }

        for (const [key, res] of Object.entries(results)) {
            if (res.error) {
                console.error(`Error in query ${key}:`, res.error)
            } else {
                console.log(`Query ${key} success. Count/Data length:`, res.count !== null ? res.count : (res.data ? res.data.length : 'N/A'))
            }
        }

    } catch (error) {
        console.error('Fatal error during dashboard queries:', error)
    }
}

testDashboardData('9f535935-89a1-469c-9bbb-4a13ddada5f7')
