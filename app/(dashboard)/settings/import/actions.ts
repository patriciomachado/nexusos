'use server';

import { createAdminClient } from '@/lib/supabase';
import { currentUser } from '@clerk/nextjs/server';
import pdf from 'pdf-parse';

export async function importDataAction(formData: FormData) {
    try {
        const clerkUser = await currentUser();
        if (!clerkUser) return { success: false, error: 'Não autorizado' };

        const supabase = createAdminClient();
        
        // Buscar o company_id do usuário
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('company_id')
            .eq('clerk_id', clerkUser.id)
            .single();

        if (userError || !userData) return { success: false, error: 'Empresa não encontrada' };
        const COMPANY_ID = userData.company_id;

        const customerFile = formData.get('customers') as File;
        const orderFile = formData.get('orders') as File;

        if (!customerFile || !orderFile) return { success: false, error: 'Arquivos ausentes' };

        // Processar Clientes
        console.log('⏳ Processando Clientes...');
        const customerBuffer = Buffer.from(await customerFile.arrayBuffer());
        const clientPdfData = await pdf(customerBuffer);
        const customers = await parseCustomers(clientPdfData.text, COMPANY_ID);

        // Processar Ordens
        console.log('⏳ Processando Ordens...');
        const orderBuffer = Buffer.from(await orderFile.arrayBuffer());
        const orderPdfData = await pdf(orderBuffer);
        const orders = await parseOrders(orderPdfData.text, COMPANY_ID);

        // Deduplicar e Importar Clientes
        const uniqueCustomers = Array.from(
            new Map(customers.map(c => [c.external_id, c])).values()
        );

        const { data: insertedCustomers, error: cError } = await supabase
            .from('customers')
            .upsert(uniqueCustomers, { onConflict: 'external_id,company_id' })
            .select('id, external_id');

        if (cError) throw new Error(`Erro ao importar clientes: ${cError.message}`);

        const clientMap = new Map();
        insertedCustomers?.forEach(c => clientMap.set(c.external_id, c.id));

        // Deduplicar e Importar Ordens
        const uniqueOrders = Array.from(
            new Map(orders.map(o => [o.external_id, o])).values()
        );

        const linkedOrders = uniqueOrders.map(o => ({
            ...o,
            customer_id: clientMap.get(o.external_client_id) || null
        })).map(({ external_client_id, ...o }: any) => o);

        // Importar em lotes
        for (let i = 0; i < linkedOrders.length; i += 500) {
            const batch = linkedOrders.slice(i, i + 500);
            const { error: oError } = await supabase
                .from('service_orders')
                .upsert(batch, { onConflict: 'external_id,company_id' });
            
            if (oError) console.error(`Erro lote ${i}:`, oError);
        }

        return { 
            success: true, 
            customersCount: uniqueCustomers.length, 
            ordersCount: uniqueOrders.length 
        };

    } catch (error: any) {
        console.error('Erro na action de importação:', error);
        return { success: false, error: error.message };
    }
}

async function parseCustomers(text: string, companyId: string) {
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
                company_id: companyId,
                name: name.substring(0, 100),
                phone: phone,
                notes: `Importado de uMDB Plus. ID: ${externalId}`,
                is_active: true
            });
        }
    }
    return customers;
}

async function parseOrders(text: string, companyId: string) {
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
            company_id: companyId,
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
