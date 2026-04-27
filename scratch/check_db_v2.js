
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUser() {
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .limit(5);
    
    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    console.log('Current users in DB:', JSON.stringify(users, null, 2));

    const { data: companies, error: compError } = await supabase
        .from('companies')
        .select('*')
        .limit(5);

    if (compError) {
        console.error('Error fetching companies:', compError);
    } else {
        console.log('Companies in DB:', JSON.stringify(companies, null, 2));
    }
}

checkUser();
