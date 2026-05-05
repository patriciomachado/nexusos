require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function extendSubscription() {
    const { data: user } = await supabase.from('users').select('id, email').eq('email', 'patriciojmf@gmail.com').single();
    console.log('User:', user?.email);
    
    const { data: company } = await supabase.from('companies').select('id').eq('owner_id', user?.id).single();
    console.log('Company ID:', company?.id);
    
    const { data: sub } = await supabase.from('subscriptions').select('*').eq('company_id', company?.id).single();
    console.log('Current period end:', sub?.current_period_end);
    
    const currentEnd = new Date(sub?.current_period_end || new Date());
    currentEnd.setDate(currentEnd.getDate() + 30);
    const newEndDate = currentEnd.toISOString();
    
    const { error } = await supabase.from('subscriptions').update({
        current_period_end: newEndDate,
        status: 'active'
    }).eq('company_id', company?.id);
    
    if (error) {
        console.log('Error:', error);
    } else {
        console.log('Success! New period end:', newEndDate);
    }
}

extendSubscription();