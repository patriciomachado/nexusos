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

async function check() {
    const { data, error } = await supabase.from('users').select('*').eq('email', 'sprtassist@gmail.com');
    console.log("USERS:", JSON.stringify(data, null, 2));
    console.log("ERROR:", error);
}

check();
