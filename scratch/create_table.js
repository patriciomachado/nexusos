const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
env.split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) envVars[k.trim()] = v.join('=').trim();
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const sql = `
    CREATE TABLE IF NOT EXISTS studio_scripts (
        id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        category TEXT DEFAULT 'Geral',
        source_type TEXT DEFAULT 'manual',
        source_id UUID,
        hook_3s TEXT NOT NULL,
        body_script TEXT NOT NULL,
        cta_text TEXT NOT NULL,
        instagram_caption TEXT,
        whatsapp_text TEXT,
        google_post TEXT,
        banner_prompt TEXT,
        is_favorite BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
    );
    `;

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    console.log('Data:', data, 'Error:', error);
}

main();
