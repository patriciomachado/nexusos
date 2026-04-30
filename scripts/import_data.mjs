import fs from 'fs';
import { createRequire } from 'module';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const COMPANY_ID = '7d9ba9af-8410-4a1a-b43e-fbe66ff6c56a';

async function parseCustomers(text) {
    const lines = text.split('\n').filter(l => l.trim().length > 5);
    const customers = [];
    
    for (const line of lines) {
        const idMatch = line.match(/^(\d+)/);
        if (!idMatch) continue;
        
        const externalId = idMatch[1];
        let name = line.substring(externalId.length).trim();
        
        const endOfName = name.search(/\d|\b(Rua|Av|Serv|Rod|Trav)\b/i);
        if (endOfName !== -1) {
            name = name.substring(0, endOfName).trim();
        }

        const phoneMatch = line.match(/(\(?\d{2}\)?\s?\d{4,5}-?\d{4})/);
        const phone = phoneMatch ? phoneMatch[0] : null;

        if (name.length > 2) {
            customers.push({
                external_id: externalId,
                company_id: COMPANY_ID,
                name: name.substring(0, 100),
                phone: phone,
                notes: `Importado de uMDB Plus. ID: ${externalId}`,
                is_active: true
            });
        }
    }
    return customers;
}

async function parseOrders(text) {
    const lines = text.split('\n').filter(l => l.trim().length > 15);
    const orders = [];
    
    for (const line of lines) {
        const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{4})/);
        if (!dateMatch) continue;

        const dateStr = dateMatch[0];
        const beforeDate = line.split(dateStr)[0].trim();
        const afterDate = line.split(dateStr)[1] || '';

        let osId = beforeDate;
        let clientId = 'N/A';
        
        if (beforeDate.length >= 2) {
            const match = beforeDate.match(/(\d+)$/);
            if (match) clientId = match[1];
            osId = beforeDate.substring(0, beforeDate.length - clientId.length) || beforeDate;
        }

        const cleanDescription = afterDate.replace(/^\d{2}:\d{2}:\d{2}/, '').trim();
        const title = cleanDescription.substring(0, 50) || 'Serviço Importado';
        const finalOsId = osId.substring(0, 50) || 'OS-' + Math.random().toString(36).substr(2, 5);

        orders.push({
            external_id: finalOsId,
            external_client_id: clientId,
            company_id: COMPANY_ID,
            order_number: finalOsId,
            title: title,
            description: cleanDescription,
            status: 'concluida',
            created_at: new Date(dateStr.split('/').reverse().join('-')).toISOString(),
            priority: 'normal'
        });
    }
    return orders;
}

async function main() {
    const isDryRun = process.argv.includes('--dry-run');
    
    console.log('⏳ Lendo CLIENTES.PDF...');
    const clientData = await pdf(fs.readFileSync('C:\\Users\\Support\\Downloads\\CLIENTES.PDF'));
    const customers = await parseCustomers(clientData.text);
    
    console.log('⏳ Lendo ORDEMS.PDF...');
    const orderData = await pdf(fs.readFileSync('C:\\Users\\Support\\Downloads\\ORDEMS.PDF'));
    const orders = await parseOrders(orderData.text);

    if (isDryRun) {
        console.log('\n--- AMOSTRA DE CLIENTES ---');
        console.table(customers.slice(0, 5).map(c => ({ ID: c.external_id, Nome: c.name })));
        console.log('\n--- AMOSTRA DE ORDENS ---');
        console.table(orders.slice(0, 5).map(o => ({ OS: o.external_id, Titulo: o.title })));
        return;
    }

    console.log(`🚀 Importando ${customers.length} clientes...`);
    // Deduplicate customers by external_id
    const uniqueCustomers = Array.from(
        new Map(customers.map(c => [c.external_id, c])).values()
    );
    console.log(`📊 Clientes únicos: ${uniqueCustomers.length}`);

    const { data: insertedCustomers, error: cError } = await supabase
        .from('customers')
        .upsert(uniqueCustomers, { onConflict: 'external_id,company_id' })
        .select('id, external_id');

    if (cError) {
        console.error('❌ Erro clientes:', cError);
        return;
    }

    const clientMap = new Map();
    insertedCustomers.forEach(c => clientMap.set(c.external_id, c.id));

    console.log(`🚀 Vinculando e importando ${orders.length} ordens...`);
    // Deduplicate orders by external_id
    const uniqueOrders = Array.from(
        new Map(orders.map(o => [o.external_id, o])).values()
    );
    console.log(`📊 Ordens únicas: ${uniqueOrders.length}`);

    const linkedOrders = uniqueOrders.map(o => ({
        ...o,
        customer_id: clientMap.get(o.external_client_id) || null
    })).map(({ external_client_id, ...o }) => o);

    for (let i = 0; i < linkedOrders.length; i += 500) {
        const batch = linkedOrders.slice(i, i + 500);
        const { error: oError } = await supabase
            .from('service_orders')
            .upsert(batch, { onConflict: 'external_id,company_id' });
        
        if (oError) console.error(`❌ Lote ${i}:`, oError);
        else console.log(`📈 Progresso: ${i + batch.length}/${linkedOrders.length}`);
    }

    console.log('✅ Concluído!');
}

main().catch(console.error);
