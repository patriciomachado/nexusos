import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listTables() {
    const { data, error } = await supabase.rpc('get_tables'); // If RPC exists
    if (error) {
        // Fallback to querying information_schema if allowed (usually not via Supabase client, but we have service role)
        const { data: tables, error: tablesError } = await supabase.from('pg_catalog.pg_tables').select('tablename').eq('schemaname', 'public');
        if (tablesError) {
             // Try a direct SQL query if possible, but the client doesn't support raw SQL easily unless there's an RPC
             console.log("Could not list tables directly. Trying common table names.");
             const commonTables = ['customers', 'service_orders', 'payments', 'users', 'companies', 'payment_methods', 'service_types', 'inventory_items', 'suppliers', 'categories'];
             for (const table of commonTables) {
                 const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
                 if (!error) console.log(`Table ${table}: ${count} rows`);
             }
        } else {
            console.log("Tables:", tables.map(t => t.tablename).join(', '));
        }
    } else {
        console.log("Tables:", data);
    }
}
listTables();
