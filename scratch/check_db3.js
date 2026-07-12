const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: so, error } = await supabase.from('service_orders').select('id, final_cost, parts_cost, labor_cost').order('created_at', { ascending: false }).limit(5);
  console.log("Service Orders Error:", error);
  console.log("Service Orders:");
  console.log(JSON.stringify(so, null, 2));
}

run();
