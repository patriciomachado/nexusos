import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { serviceOrderSchema, idSchema } from '@/lib/validations/schemas'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId } = ctx
    const { id } = await params
    
    if (!idSchema.safeParse(id).success) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const { data, error } = await db
        .from('service_orders')
        .select('*, customers(*), technicians(*), service_order_items(*), service_order_attachments(*), service_order_history(*), payments(*)')
        .eq('id', id)
        .eq('company_id', companyId)
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 404 })
    return NextResponse.json(data)
}

export async function PUT(req: NextRequest, { params }: Params) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId } = ctx
    const { id } = await params
    
    if (!idSchema.safeParse(id).success) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }
    const body = await req.json()
    
    // Validate body
    const validation = serviceOrderSchema.partial().safeParse(body)
    if (!validation.success) {
        return NextResponse.json({ error: validation.error.format() }, { status: 400 })
    }

    const { items, ...updateData } = validation.data

    // Check if technician is being assigned
    const newTechId = updateData.technician_id
    let techNotification = null
    if (newTechId) {
        const { data: currentOS } = await db
            .from('service_orders')
            .select('technician_id, order_number, title')
            .eq('id', id)
            .single()
        
        if (currentOS && currentOS.technician_id !== newTechId) {
            const { data: technician } = await db
                .from('technicians')
                .select('user_id, name')
                .eq('id', newTechId)
                .single()
            
            if (technician?.user_id) {
                techNotification = {
                    user_id: technician.user_id,
                    title: 'Nova OS atribuída',
                    message: `A OS #${currentOS.order_number} - ${currentOS.title} foi atribuída a você`,
                    related_entity_type: 'service_order',
                    related_entity_id: id
                }
            }
        }
    }

    const { data, error } = await db
        .from('service_orders')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Create notification for technician if assigned
    if (techNotification) {
        await db.from('notifications').insert({
            company_id: companyId,
            type: 'push',
            ...techNotification,
            status: 'pending'
        })
    }

    // Sync items if present in body
    if (items && Array.isArray(items)) {
        // 1. Delete existing items - ensure they belong to this SO
        await db.from('service_order_items').delete().eq('service_order_id', id)

        // 2. Insert new items with cost tracking
        let totalPartsCost = 0;
        if (items.length > 0) {
            const itemsToInsert = []
            
            for (const item of items) {
                let unitCost = item.unit_cost || 0
                
                // If inventory item, try to get cost if not provided
                if (item.inventory_item_id && unitCost === 0) {
                    const { data: invItem } = await db
                        .from('inventory_items')
                        .select('cost_price')
                        .eq('id', item.inventory_item_id)
                        .eq('company_id', companyId)
                        .single()
                    if (invItem) unitCost = invItem.cost_price || 0
                }

                const itemTotalCost = unitCost * item.quantity
                totalPartsCost += itemTotalCost

                itemsToInsert.push({
                    service_order_id: id,
                    inventory_item_id: item.inventory_item_id || null,
                    item_name: item.item_name,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    total_price: item.total_price,
                    unit_cost: unitCost,
                    total_cost: itemTotalCost
                })
            }

            if (itemsToInsert.length > 0) {
                await db.from('service_order_items').insert(itemsToInsert)
            }
        }

        // 3. Update the header parts_cost
        await db
            .from('service_orders')
            .update({ parts_cost: totalPartsCost })
            .eq('id', id)
            .eq('company_id', companyId)
    }

    return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: Params) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId, dbUser } = ctx
    const { id } = await params
    
    if (!idSchema.safeParse(id).success) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    try {
        // 1. Buscar OS completa para calcular custos a estornar
        const { data: osToDelete } = await db
            .from('service_orders')
            .select('order_number, final_cost, estimated_cost, parts_cost, labor_cost')
            .eq('id', id)
            .eq('company_id', companyId)
            .single()

        // 2. Apagar itens da OS
        await db.from('service_order_items').delete().eq('service_order_id', id)
        
        // 3. Apagar histórico e anexos (se existirem, para evitar erro de FK)
        await db.from('service_order_history').delete().eq('service_order_id', id)
        await db.from('service_order_attachments').delete().eq('service_order_id', id)

        // 4. Apagar pagamentos vinculados
        await db.from('payments').delete().eq('service_order_id', id).eq('company_id', companyId)

        // 5. Buscar registro de caixa aberto
        const { data: openRegisters } = await db
            .from('cash_registers')
            .select('id')
            .eq('company_id', companyId)
            .eq('status', 'open')
            .order('opened_at', { ascending: false })

        const openRegister = openRegisters && openRegisters.length > 0 ? openRegisters[0] : null

        // 6. Estornar receitas e custos do caixa - CRÍTICO!
        const { data: existingTransactions } = await db
            .from('cash_transactions')
            .select('id, type, amount')
            .eq('source_type', 'service_order')
            .eq('source_id', id)
            .eq('company_id', companyId)

        if (openRegister && existingTransactions && existingTransactions.length > 0) {
            for (const trans of existingTransactions) {
                const newType = trans.type === 'entry' ? 'exit' : 'entry'
                const osNumber = osToDelete?.order_number || 'OS'
                const descPrefix = trans.type === 'entry' ? 'Estorno Receita' : 'Estorno Custo'
                
                await db.from('cash_transactions').insert({
                    cash_register_id: openRegister.id,
                    company_id: companyId,
                    user_id: dbUser.id,
                    type: newType,
                    amount: trans.amount,
                    description: `${descPrefix} - ${osNumber} (_EXCLUIDA_)`,
                    source_type: 'service_order',
                    source_id: id,
                    reference_transaction_id: trans.id
                })
            }
        }

        // 7. Deletar transações antigas do caixa (REMOVIDO: Manter para histórico com estorno)
        // O estorno já foi criado acima se necessário. Deletar aqui causaria discrepância dupla no saldo.

        // 8. Apagar a OS em si
        const { error } = await db
            .from('service_orders')
            .delete()
            .eq('id', id)
            .eq('company_id', companyId)

        if (error) {
            console.error('Erro ao excluir OS:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('Exceção ao excluir OS:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
