import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function audit() {
  console.log('--- Companies ---');
  const { data: companies } = await supabase.from('companies').select('id, name');
  console.table(companies);

  for (const company of companies) {
    console.log(`\n--- Audit for: ${company.name} (${company.id}) ---`);
    
    // Customers
    const { count: customerCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', company.id);
    
    const { data: customerRange } = await supabase
      .from('customers')
      .select('created_at')
      .eq('company_id', company.id)
      .order('created_at', { ascending: true })
      .limit(1);

    const { data: customerLast } = await supabase
      .from('customers')
      .select('created_at')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .limit(1);

    console.log(`Customers: ${customerCount}`);
    if (customerCount > 0) {
      console.log(`  First created: ${customerRange[0].created_at}`);
      console.log(`  Last created: ${customerLast[0].created_at}`);
    }

    // Service Orders
    const { count: osCount } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', company.id);

    const { data: osRange } = await supabase
      .from('service_orders')
      .select('created_at')
      .eq('company_id', company.id)
      .order('created_at', { ascending: true })
      .limit(1);

    const { data: osLast } = await supabase
      .from('service_orders')
      .select('created_at')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .limit(1);

    console.log(`Service Orders: ${osCount}`);
    if (osCount > 0) {
      console.log(`  First created: ${osRange[0].created_at}`);
      console.log(`  Last created: ${osLast[0].created_at}`);
    }

    // Samples for Cfrag
    if (company.name.includes('Cfrag')) {
        const { data: samples } = await supabase.from('customers').select('name').eq('company_id', company.id).limit(5);
        console.log('  Customer Samples:', samples.map(s => s.name));
    }
  }
}

audit().catch(console.error);
