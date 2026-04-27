
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findUser() {
    console.log('Searching for users named Patricio...');
    const { data: users, error } = await supabase
        .from('users')
        .select('*, companies(*)')
        .ilike('full_name', '%Patricio%');
    
    if (error) {
        console.error('Error:', error);
        return;
    }

    if (users.length === 0) {
        console.log('No user found with name Patricio.');
        // List all users to see what we have
        const { data: allUsers } = await supabase.from('users').select('full_name, clerk_id, company_id').limit(10);
        console.log('First 10 users:', allUsers);
    } else {
        console.log('Found user(s):', JSON.stringify(users, null, 2));
    }
}

findUser();
