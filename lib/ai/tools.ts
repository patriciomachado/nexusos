import { tool } from 'ai'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

// Using service role key for full DB access in tools
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            persistSession: false,
        },
    }
)

export const tools = {
    manage_os: tool({
        description: 'Gerencia ordens de serviço (criar, atualizar, buscar)',
        inputSchema: z.object({
            action: z.enum(['create', 'update', 'search', 'get_details']),
            data: z.object({
                id: z.string().optional(),
                title: z.string().optional(),
                customer_id: z.string().optional(),
                technician_id: z.string().optional(),
                status: z.string().optional(),
                priority: z.string().optional(),
                equipment_description: z.string().optional(),
                problem_description: z.string().optional(),
                estimated_cost: z.number().optional(),
            }),
            company_id: z.string(),
        }),
        execute: async ({ action, data, company_id }) => {
            console.log(`[TOOL:manage_os] Action: ${action}, Company: ${company_id}`)
            try {
                if (action === 'search') {
                    const { data: os, error } = await supabaseAdmin
                        .from('service_orders')
                        .select('*, customers(name)')
                        .eq('company_id', company_id)
                        .or(`title.ilike.%${data.title || ''}%,order_number.ilike.%${data.title || ''}%`)
                        .limit(10)
                    if (error) throw error
                    return { os }
                }

                if (action === 'get_details' && data.id) {
                    const { data: os, error } = await supabaseAdmin
                        .from('service_orders')
                        .select('*, customers(*), technicians(*), service_order_items(*)')
                        .eq('id', data.id)
                        .eq('company_id', company_id)
                        .single()
                    if (error) throw error
                    return { os }
                }

                if (action === 'create') {
                    const { data: lastOS } = await supabaseAdmin
                        .from('service_orders')
                        .select('order_number')
                        .eq('company_id', company_id)
                        .order('order_number', { ascending: false })
                        .limit(1)
                        .maybeSingle()

                    let nextNum = 1
                    if (lastOS?.order_number) {
                        const currentNum = parseInt(lastOS.order_number.replace('OS-', ''))
                        if (!isNaN(currentNum)) nextNum = currentNum + 1
                    }
                    const orderNumber = `OS-${String(nextNum).padStart(5, '0')}`

                    const { data: newOS, error } = await supabaseAdmin
                        .from('service_orders')
                        .insert({
                            ...data,
                            company_id,
                            order_number: orderNumber,
                            status: data.status || 'aberta',
                        })
                        .select()
                        .single()
                    if (error) throw error
                    return { success: true, os: newOS }
                }

                if (action === 'update' && data.id) {
                    const { data: updatedOS, error } = await supabaseAdmin
                        .from('service_orders')
                        .update(data)
                        .eq('id', data.id)
                        .eq('company_id', company_id)
                        .select()
                        .single()
                    if (error) throw error
                    return { success: true, os: updatedOS }
                }

                return { error: 'Ação inválida ou ID ausente' }
            } catch (err: any) {
                console.error('[TOOL:manage_os] Error:', err)
                return { error: err.message }
            }
        },
    }),

    manage_customers: tool({
        description: 'Gerencia clientes (buscar, criar, atualizar)',
        inputSchema: z.object({
            action: z.enum(['search', 'create', 'update']),
            data: z.object({
                id: z.string().optional(),
                name: z.string().optional(),
                email: z.string().optional(),
                phone: z.string().optional(),
                document: z.string().optional(),
            }),
            company_id: z.string(),
        }),
        execute: async ({ action, data, company_id }) => {
            console.log(`[TOOL:manage_customers] Action: ${action}, Company: ${company_id}`)
            try {
                if (action === 'search') {
                    const { data: customers, error } = await supabaseAdmin
                        .from('customers')
                        .select('*')
                        .eq('company_id', company_id)
                        .or(`name.ilike.%${data.name || ''}%,phone.ilike.%${data.name || ''}%`)
                        .limit(5)
                    if (error) throw error
                    return { customers }
                }

                if (action === 'create') {
                    const { data: customer, error } = await supabaseAdmin
                        .from('customers')
                        .insert({ ...data, company_id })
                        .select()
                        .single()
                    if (error) throw error
                    return { success: true, customer }
                }

                if (action === 'update' && data.id) {
                    const { data: customer, error } = await supabaseAdmin
                        .from('customers')
                        .update(data)
                        .eq('id', data.id)
                        .eq('company_id', company_id)
                        .select()
                        .single()
                    if (error) throw error
                    return { success: true, customer }
                }

                return { error: 'Ação inválida' }
            } catch (err: any) {
                console.error('[TOOL:manage_customers] Error:', err)
                return { error: err.message }
            }
        },
    }),

    manage_finance: tool({
        description: 'Gerencia finanças (depósitos, retiradas e consulta de saldo)',
        inputSchema: z.object({
            action: z.enum(['deposit', 'withdraw', 'get_balance']),
            data: z.object({
                amount: z.number().optional(),
                description: z.string().optional(),
                cash_register_id: z.string().optional(),
                payment_method_id: z.string().optional(),
            }).optional(),
            company_id: z.string(),
            user_id: z.string().optional(),
        }),
        execute: async ({ action, data, company_id, user_id }) => {
            console.log(`[TOOL:manage_finance] Action: ${action}, Company: ${company_id}`)
            try {
                if (action === 'get_balance') {
                    // First find users for this company
                    const { data: companyUsers } = await supabaseAdmin
                        .from('users')
                        .select('id')
                        .eq('company_id', company_id)
                    
                    const userIds = companyUsers?.map(u => u.id) || []

                    const { data: registers, error } = await supabaseAdmin
                        .from('cash_registers')
                        .select('*')
                        .in('user_id', userIds)
                        .eq('status', 'open')
                    
                    if (error) throw error
                    return { registers }
                }

                if (!data || !data.amount || !data.cash_register_id) {
                    return { error: 'Dados insuficientes para transação' }
                }

                const type = action === 'deposit' ? 'entry' : 'exit'
                
                let paymentMethodId = data.payment_method_id
                if (!paymentMethodId) {
                    const { data: method } = await supabaseAdmin.from('payment_methods').select('id').limit(1).single()
                    paymentMethodId = method?.id
                }

                const { data: transaction, error } = await supabaseAdmin
                    .from('cash_transactions')
                    .insert({
                        ...data,
                        type,
                        user_id,
                        payment_method_id: paymentMethodId,
                        source_type: 'manual_suprimento',
                    })
                    .select()
                    .single()

                if (error) throw error
                return { success: true, transaction }
            } catch (err: any) {
                console.error('[TOOL:manage_finance] Error:', err)
                return { error: err.message }
            }
        },
    }),

    manage_inventory: tool({
        description: 'Gerencia estoque (buscar, vender ou adicionar itens)',
        inputSchema: z.object({
            action: z.enum(['search', 'sale', 'add']),
            data: z.object({
                item_id: z.string().optional(),
                name: z.string().optional(),
                quantity: z.number().optional(),
            }),
            company_id: z.string(),
        }),
        execute: async ({ action, data, company_id }) => {
            console.log(`[TOOL:manage_inventory] Action: ${action}, Company: ${company_id}`)
            try {
                if (action === 'search') {
                    const { data: items, error } = await supabaseAdmin
                        .from('inventory_items')
                        .select('*')
                        .eq('company_id', company_id)
                        .ilike('name', `%${data.name || ''}%`)
                        .limit(10)
                    if (error) throw error
                    return { items }
                }

                if (!data.item_id || data.quantity === undefined) {
                    return { error: 'Item ID e quantidade são obrigatórios para esta ação' }
                }

                const { data: item } = await supabaseAdmin
                    .from('inventory_items')
                    .select('quantity_in_stock')
                    .eq('id', data.item_id)
                    .eq('company_id', company_id)
                    .single()

                if (!item) return { error: 'Item não encontrado' }

                const newQuantity = action === 'add' ? item.quantity_in_stock + data.quantity : item.quantity_in_stock - data.quantity

                const { data: updatedItem, error } = await supabaseAdmin
                    .from('inventory_items')
                    .update({ quantity_in_stock: newQuantity })
                    .eq('id', data.item_id)
                    .eq('company_id', company_id)
                    .select()
                    .single()

                if (error) throw error
                return { success: true, item: updatedItem }
            } catch (err: any) {
                console.error('[TOOL:manage_inventory] Error:', err)
                return { error: err.message }
            }
        },
    }),

    get_business_summary: tool({
        description: 'Obtém um resumo do negócio (OS abertas, faturamento no período)',
        inputSchema: z.object({
            period: z.enum(['today', 'week', 'month']),
            company_id: z.string(),
        }),
        execute: async ({ period, company_id }) => {
            console.log(`[TOOL:get_business_summary] Period: ${period}, Company: ${company_id}`)
            try {
                const startDate = new Date()
                startDate.setHours(0, 0, 0, 0)

                if (period === 'week') {
                    startDate.setDate(startDate.getDate() - 7)
                } else if (period === 'month') {
                    startDate.setDate(1) // Início do mês
                }

                // 1. Find users for this company to filter registers/transactions
                const { data: companyUsers } = await supabaseAdmin
                    .from('users')
                    .select('id')
                    .eq('company_id', company_id)
                
                const userIds = companyUsers?.map(u => u.id) || []

                // 2. Find registers for these users
                const { data: registers } = await supabaseAdmin
                    .from('cash_registers')
                    .select('id')
                    .in('user_id', userIds)
                
                const registerIds = registers?.map(r => r.id) || []

                // 3. Parallel queries
                const [osResult, transResult] = await Promise.all([
                    supabaseAdmin
                        .from('service_orders')
                        .select('*', { count: 'exact', head: true })
                        .eq('company_id', company_id)
                        .eq('status', 'aberta'),
                    registerIds.length > 0 
                        ? supabaseAdmin
                            .from('cash_transactions')
                            .select('amount')
                            .eq('type', 'entry')
                            .gte('created_at', startDate.toISOString())
                            .in('cash_register_id', registerIds)
                        : Promise.resolve({ data: [], error: null })
                ])

                if (osResult.error) throw osResult.error
                if (transResult.error) throw transResult.error

                const revenue = transResult.data?.reduce((sum, t: any) => sum + t.amount, 0) || 0
                const periodLabel = period === 'today' ? 'hoje' : period === 'week' ? 'esta semana' : 'este mês'

                return {
                    open_os_count: osResult.count || 0,
                    revenue,
                    message: `Existem ${osResult.count || 0} OS abertas. O faturamento de ${periodLabel} é R$ ${revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`
                }
            } catch (err: any) {
                console.error('[TOOL:get_business_summary] Error:', err)
                return { error: 'Não consegui acessar os dados agora. ' + err.message }
            }
        },
    }),

    list_technicians: tool({
        description: 'Lista todos os técnicos da empresa',
        inputSchema: z.object({
            company_id: z.string(),
        }),
        execute: async ({ company_id }) => {
            console.log(`[TOOL:list_technicians] Company: ${company_id}`)
            try {
                const { data: technicians, error } = await supabaseAdmin
                    .from('technicians')
                    .select('*')
                    .eq('company_id', company_id)
                    .eq('is_active', true)
                
                if (error) throw error
                return { technicians }
            } catch (err: any) {
                console.error('[TOOL:list_technicians] Error:', err)
                return { error: err.message }
            }
        },
    }),
}
