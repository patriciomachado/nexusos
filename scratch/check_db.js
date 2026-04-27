
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkProfiles() {
    const { data, error } = await supabase
        .from('profiles')
        .select('*');
    
    if (error) {
        console.error('Error fetching profiles:', error);
        return;
    }

    console.log('Profiles found:', JSON.stringify(data, null, 2));

    const { data: companies } = await supabase.from('companies').select('*');
    console.log('Companies found:', JSON.stringify(companies, null, 2));
}

checkProfiles();
