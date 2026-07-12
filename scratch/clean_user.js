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

async function clean() {
    const { data, error } = await supabase.from('users').delete().eq('clerk_id', 'user_3AftIQ83A2gMEqnj0FaQPsrn2UX');
    console.log("Deleted erroneous admin user.", error);
}

clean();
