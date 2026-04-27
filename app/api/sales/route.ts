import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'
import { CreateSaleForm } from '@/types'

export async function POST(req: NextRequest) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const db = createAdminClient()
    const { data: user } = await db.from('users').select('id, company_id').eq('clerk_id', userId).single()
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const body: CreateSaleForm = await req.json()

    // 1. Check if cash register is open
    let registerId = body.cash_register_id

    const { data: openRegisters } = await db
        .from('cash_registers')
        .select('id')
        .eq('company_id', user.company_id)
        .eq('status', 'open')
        .order('opened_at', { ascending: false })

    const activeRegister = openRegisters && openRegisters.length > 0 ? openRegisters[0] : null

    if (!activeRegister) {
        return NextResponse.json({ error: 'Nenhum caixa aberto encontrado para esta empresa.' }, { status: 400 })
    }

    // Use the active register found in DB to avoid issues with stale IDs from frontend
    registerId = activeRegister.id

    try {
        // 2. Create Sale
        const { data: sale, error: saleError } = await db
            .from('sales')
            .insert({
                company_id: user.company_id,
                user_id: user.id,
                customer_id: body.customer_id || null,
                cash_register_id: registerId,
                total_amount: body.total_amount,
                discount_amount: body.discount_amount,
                final_amount: body.final_amount,
                payment_method_id: body.payment_method_id,
                status: 'completed',
                notes: body.notes
            })
            .select()
            .single()

        if (saleError) throw saleError

        // 3. Create Sale Items and Update Stock
        let totalCost = 0;
        for (const item of body.items) {
            // Get item cost
            const { data: stockItem } = await db
                .from('inventory_items')
                .select('quantity_in_stock, cost_price')
                .eq('id', item.inventory_item_id)
                .single()

            const unitCost = stockItem?.cost_price || 0;
            const itemTotalCost = unitCost * item.quantity;
            totalCost += itemTotalCost;

            // Create item with costs
            const { error: itemError } = await db
                .from('sale_items')
                .insert({
                    sale_id: sale.id,
                    inventory_item_id: item.inventory_item_id,
                    item_name: item.item_name,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    total_price: item.total_price,
                    unit_cost: unitCost,
                    total_cost: itemTotalCost
                })

            if (itemError) throw itemError

            // Update Stock
            if (stockItem) {
                await db
                    .from('inventory_items')
                    .update({
                        quantity_in_stock: Number(stockItem.quantity_in_stock) - Number(item.quantity)
                    })
                    .eq('id', item.inventory_item_id)
            }
        }

        // Update total cost on sale header
        await db
            .from('sales')
            .update({ total_cost: totalCost })
            .eq('id', sale.id)

        // 4. Register Cash Transaction
        const { data: transType } = await db
            .from('transaction_types')
            .select('id')
            .eq('code', 'PRODUCT_SALE')
            .single()

        const { error: cashError } = await db
            .from('cash_transactions')
            .insert({
                cash_register_id: registerId,
                company_id: user.company_id,
                type: 'entry',
                amount: body.final_amount,
                payment_method_id: body.payment_method_id,
                transaction_type_id: transType?.id,
                description: `Venda PDV - ID: ${sale.id.substring(0, 8)}`,
                source_type: 'product_sale',
                source_id: sale.id,
                user_id: user.id
            })

        if (cashError) throw cashError

        // 5. Register Payment (Financial History)
        const { data: pm } = await db
            .from('payment_methods')
            .select('code')
            .eq('id', body.payment_method_id)
            .single()

        const methodMap: Record<string, string> = {
            'CASH': 'dinheiro',
            'DEBIT_CARD': 'cartao_debito',
            'CREDIT_CARD': 'cartao_credito',
            'PIX': 'pix',
            'CHEQUE': 'transferencia',
            'INSTALLMENT': 'crediario'
        }

        const { error: paymentError } = await db
            .from('payments')
            .insert({
                company_id: user.company_id,
                customer_id: body.customer_id || null,
                amount: body.final_amount,
                payment_method: methodMap[pm?.code || ''] || 'dinheiro',
                payment_status: 'completed',
                payment_date: new Date().toISOString(),
                reference_id: sale.id,
                sale_id: sale.id,
                notes: `Venda PDV - ID: ${sale.id.substring(0, 8)}`,
                created_by: user.id
            })

        if (paymentError) console.error('Error creating payment record:', paymentError)

        return NextResponse.json(sale, { status: 201 })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
