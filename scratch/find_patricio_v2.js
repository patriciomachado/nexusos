
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findUser() {
    const { data: users } = await supabase
        .from('users')
        .select('full_name, clerk_id, company_id')
        .ilike('full_name', '%Patricio%');
    
    users.forEach(u => {
        console.log(`User: ${u.full_name} | Clerk ID: ${u.clerk_id} | Company ID: ${u.company_id}`);
    });
}

findUser();
