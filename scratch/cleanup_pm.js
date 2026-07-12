
import { createAdminClient } from './lib/supabase.js';

async function cleanupDuplicates() {
    const supabase = createAdminClient();

    // Fetch all payment methods
    const { data: methods, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('company_id', { nullsFirst: true })
        .order('name');

    if (error) {
        console.error('Error fetching methods:', error);
        return;
    }

    console.log(`Found ${methods.length} methods.`);

    const seen = new Set();
    const toDelete = [];

    for (const m of methods) {
        // Key is company_id + name or company_id + code
        const key = `${m.company_id}-${m.name.trim().toUpperCase()}`;
        if (seen.has(key)) {
            toDelete.push(m.id);
        } else {
            seen.add(key);
        }
    }

    if (toDelete.length === 0) {
        console.log('No duplicates found.');
        return;
    }

    console.log(`Deleting ${toDelete.length} duplicates:`, toDelete);

    const { error: deleteError } = await supabase
        .from('payment_methods')
        .delete()
        .in('id', toDelete);

    if (deleteError) {
        console.error('Error deleting duplicates:', deleteError);
    } else {
        console.log('Successfully deleted duplicates.');
    }
}

cleanupDuplicates();
