const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envPath = '.env.local';
let envUrl = '';
let envKey = '';

try {
    const envFile = fs.readFileSync(envPath, 'utf8');
    const lines = envFile.split('\n');
    lines.forEach(line => {
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) envUrl = line.split('=')[1].trim();
        if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) envKey = line.split('=')[1].trim();
    });
} catch (e) {
    console.log("Error reading env: ", e);
}

const supabase = createClient(envUrl, envKey);

async function merge() {
    // 1. Delete the "invite" placeholder since the real user signed in as admin already
    const { error: e1 } = await supabase.from('users').delete().eq('id', 'd2ec7e69-686a-4142-96c9-1ff7280705a4');
    console.log("Delete invite error: ", e1);

    // 2. Update the "wrong admin" to become the real attendant
    const { error: e2 } = await supabase.from('users').update({
        email: 'sprtassist@gmail.com',
        role: 'attendant',
        full_name: 'Support'
    }).eq('id', '7327b360-70f2-4e2c-959e-92913d179247');
    console.log("Update admin error: ", e2);
}

merge();
