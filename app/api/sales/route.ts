import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { saleSchema } from '@/lib/validations/schemas'

export async function POST(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId, dbUser } = ctx
    const body = await req.json()

    // 1. Validate request body
    const validation = saleSchema.safeParse(body)
    if (!validation.success) {
        return NextResponse.json({ error: validation.error.format() }, { status: 400 })
    }

    const { items, ...saleData } = validation.data

    // 2. Ensure cash register is open and belongs to the company
    let registerId = saleData.cash_register_id

    const { data: activeRegister, error: registerError } = await db
        .from('cash_registers')
        .select('id')
        .eq('company_id', companyId)
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (registerError || !activeRegister) {
        return NextResponse.json({ error: 'Nenhum caixa aberto encontrado para esta empresa.' }, { status: 400 })
    }

    // Use the active register found in DB to ensure tenancy and prevent stale IDs
    registerId = activeRegister.id

    try {
        // Fetch items and calculate prices from DB first to prevent price manipulation
        let calculatedTotalAmount = 0
        const itemsToInsert = []
        const stockUpdates = []

        for (const item of items) {
            // Get item cost and price - ensure it belongs to the company
            const { data: stockItem } = await db
                .from('inventory_items')
                .select('quantity_in_stock, cost_price, selling_price')
                .eq('id', item.inventory_item_id)
                .eq('company_id', companyId)
                .single()

            if (!stockItem) throw new Error(`Item de estoque não encontrado ou não pertence à empresa: ${item.item_name}`)

            const unitPrice = stockItem.selling_price || 0
            const itemTotalPrice = unitPrice * item.quantity
            const unitCost = stockItem.cost_price || 0
            const itemTotalCost = unitCost * item.quantity

            calculatedTotalAmount += itemTotalPrice

            itemsToInsert.push({
                inventory_item_id: item.inventory_item_id,
                item_name: item.item_name,
                quantity: item.quantity,
                unit_price: unitPrice,
                total_price: itemTotalPrice,
                unit_cost: unitCost,
                total_cost: itemTotalCost
            })

            stockUpdates.push({
                id: item.inventory_item_id,
                new_stock: Number(stockItem.quantity_in_stock) - Number(item.quantity)
            })
        }

        const calculatedFinalAmount = Math.max(0, calculatedTotalAmount - (saleData.discount_amount || 0))

        // 3. Create Sale
        const { data: sale, error: saleError } = await db
            .from('sales')
            .insert({
                ...saleData,
                total_amount: calculatedTotalAmount,
                final_amount: calculatedFinalAmount,
                company_id: companyId,
                user_id: dbUser.id,
                cash_register_id: registerId,
                status: 'completed',
            })
            .select()
            .single()

        if (saleError) throw saleError

        // 4. Create Sale Items and Update Stock
        let totalCost = 0;
        for (let i = 0; i < itemsToInsert.length; i++) {
            const insertData = itemsToInsert[i]
            const updateData = stockUpdates[i]

            totalCost += insertData.total_cost

            // Create item
            const { error: itemError } = await db
                .from('sale_items')
                .insert({
                    sale_id: sale.id,
                    ...insertData
                })

            if (itemError) throw itemError

            // Update Stock
            await db
                .from('inventory_items')
                .update({
                    quantity_in_stock: updateData.new_stock
                })
                .eq('id', updateData.id)
                .eq('company_id', companyId)
        }

        // Update total cost on sale header
        await db
            .from('sales')
            .update({ total_cost: totalCost })
            .eq('id', sale.id)
            .eq('company_id', companyId)

        // 5. Register Cash Transaction
        const { data: transType } = await db
            .from('transaction_types')
            .select('id')
            .eq('code', 'PRODUCT_SALE')
            .single()

        const { error: cashError } = await db
            .from('cash_transactions')
            .insert({
                cash_register_id: registerId,
                company_id: companyId,
                type: 'entry',
                amount: calculatedFinalAmount,
                payment_method_id: saleData.payment_method_id,
                transaction_type_id: transType?.id,
                description: `Venda PDV - ID: ${sale.id.substring(0, 8)}`,
                source_type: 'product_sale',
                source_id: sale.id,
                user_id: dbUser.id
            })

        if (cashError) throw cashError

        // 5.1 Register Product Cost as Expense (if cost > 0)
        const costValue = Number(totalCost) || 0
        if (costValue > 0) {
            const { error: costError } = await db
                .from('cash_transactions')
                .insert({
                    cash_register_id: registerId,
                    company_id: companyId,
                    type: 'exit',
                    amount: costValue,
                    payment_method_id: saleData.payment_method_id,
                    description: `Custo Produtos - Venda ID: ${sale.id.substring(0, 8)}`,
                    source_type: 'product_sale',
                    source_id: sale.id,
                    user_id: dbUser.id
                })

            if (costError) console.error('Error creating cost transaction:', costError)
        }

        // 6. Register Payment (Financial History)
        const { data: pm } = await db
            .from('payment_methods')
            .select('code')
            .eq('id', saleData.payment_method_id)
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
                company_id: companyId,
                customer_id: saleData.customer_id || null,
                amount: calculatedFinalAmount,
                payment_method: methodMap[pm?.code || ''] || 'dinheiro',
                payment_status: 'completed',
                payment_date: new Date().toISOString(),
                reference_id: sale.id,
                sale_id: sale.id,
                notes: `Venda PDV - ID: ${sale.id.substring(0, 8)}`,
                created_by: dbUser.id
            })

        if (paymentError) console.error('Error creating payment record:', paymentError)

        return NextResponse.json(sale, { status: 201 })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
