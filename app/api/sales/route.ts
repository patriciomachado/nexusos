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
    const { data: cashRegister } = await db
        .from('cash_registers')
        .select('id')
        .eq('id', body.cash_register_id)
        .eq('status', 'open')
        .single()

    if (!cashRegister) {
        return NextResponse.json({ error: 'Caixa fechado ou inexistente.' }, { status: 400 })
    }

    try {
        // 2. Create Sale
        const { data: sale, error: saleError } = await db
            .from('sales')
            .insert({
                company_id: user.company_id,
                user_id: user.id,
                customer_id: body.customer_id || null,
                cash_register_id: body.cash_register_id,
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
        for (const item of body.items) {
            // Create item
            const { error: itemError } = await db
                .from('sale_items')
                .insert({
                    sale_id: sale.id,
                    inventory_item_id: item.inventory_item_id,
                    item_name: item.item_name,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    total_price: item.total_price
                })

            if (itemError) throw itemError

            // Update Stock
            const { data: stockItem } = await db
                .from('inventory_items')
                .select('quantity_in_stock')
                .eq('id', item.inventory_item_id)
                .single()

            if (stockItem) {
                await db
                    .from('inventory_items')
                    .update({
                        quantity_in_stock: Number(stockItem.quantity_in_stock) - Number(item.quantity)
                    })
                    .eq('id', item.inventory_item_id)
            }
        }

        // 4. Register Cash Transaction
        const { data: transType } = await db
            .from('transaction_types')
            .select('id')
            .eq('code', 'PRODUCT_SALE')
            .single()

        const { error: cashError } = await db
            .from('cash_transactions')
            .insert({
                cash_register_id: body.cash_register_id,
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

        return NextResponse.json(sale, { status: 201 })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
