import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listAllUsers() {
    const { data: users } = await supabase.from('users').select('*');
    console.log(JSON.stringify(users, null, 2));
}
listAllUsers();
