const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: so } = await supabase.from('service_orders').select('id, total_amount, parts_cost').order('created_at', { ascending: false }).limit(2);
  const { data: sales } = await supabase.from('sales').select('id, final_amount, total_cost').order('created_at', { ascending: false }).limit(2);

  console.log("Service Orders:");
  console.log(JSON.stringify(so, null, 2));
  console.log("Sales:");
  console.log(JSON.stringify(sales, null, 2));
}

run();
