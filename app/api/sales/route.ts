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

    const { items, payments: splitPayments, ...saleData } = validation.data

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

        // 2.1 Resolve payments (single method, or split across several).
        // Only cash can exceed what it covers; the excess is the change.
        const round2 = (n: number) => Math.round(n * 100) / 100
        const splits = splitPayments?.length
            ? splitPayments
            : saleData.payment_method_id
                ? [{ payment_method_id: saleData.payment_method_id, amount: calculatedFinalAmount }]
                : []
        if (splits.length === 0) {
            return NextResponse.json({ error: 'Selecione a forma de pagamento.' }, { status: 400 })
        }

        const methodIds = [...new Set(splits.map(p => p.payment_method_id))]
        const { data: methods } = await db
            .from('payment_methods')
            .select('id, code, name')
            .in('id', methodIds)
        if (!methods || methods.length !== methodIds.length) {
            return NextResponse.json({ error: 'Forma de pagamento inválida.' }, { status: 400 })
        }
        const methodById = new Map(methods.map(m => [m.id, m]))
        const isCash = (id: string) => (methodById.get(id)?.code || '').toUpperCase() === 'CASH'

        const nonCashTotal = round2(splits.filter(p => !isCash(p.payment_method_id)).reduce((sum, p) => sum + p.amount, 0))
        const cashTotal = round2(splits.filter(p => isCash(p.payment_method_id)).reduce((sum, p) => sum + p.amount, 0))

        if (nonCashTotal > calculatedFinalAmount + 0.009) {
            return NextResponse.json({ error: 'O valor em cartão/PIX é maior que o total da venda.' }, { status: 400 })
        }
        const balance = round2(nonCashTotal + cashTotal - calculatedFinalAmount)
        if (splitPayments?.length && balance < -0.009) {
            return NextResponse.json({ error: `Faltam R$ ${(-balance).toFixed(2).replace('.', ',')} para completar o pagamento.` }, { status: 400 })
        }
        const change = Math.max(0, balance)

        // Net amount per method (same method merged; change taken out of cash).
        const netByMethod = new Map<string, number>()
        for (const p of splits) netByMethod.set(p.payment_method_id, round2((netByMethod.get(p.payment_method_id) || 0) + p.amount))
        let changeLeft = change
        for (const [id, amount] of netByMethod) {
            if (!isCash(id) || changeLeft <= 0) continue
            const take = Math.min(amount, changeLeft)
            netByMethod.set(id, round2(amount - take))
            changeLeft = round2(changeLeft - take)
        }
        let paymentEntries = [...netByMethod].filter(([, amount]) => amount > 0.009)
        if (paymentEntries.length === 0) paymentEntries = [[splits[0].payment_method_id, calculatedFinalAmount]]
        paymentEntries.sort((a, b) => b[1] - a[1])
        const primaryMethodId = paymentEntries[0][0]

        const fmt = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`
        const paymentSummary = paymentEntries.length > 1 || change > 0
            ? `Pagamento: ${paymentEntries.map(([id, amount]) => `${methodById.get(id)?.name} ${fmt(amount)}`).join(' + ')}${change > 0 ? ` · Recebido em dinheiro ${fmt(cashTotal)}, troco ${fmt(change)}` : ''}`
            : null

        // 3. Create Sale
        const { data: sale, error: saleError } = await db
            .from('sales')
            .insert({
                ...saleData,
                payment_method_id: primaryMethodId,
                notes: [saleData.notes, paymentSummary].filter(Boolean).join('\n') || null,
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

        // One entry per payment method, so the register closes correctly by method.
        const { error: cashError } = await db
            .from('cash_transactions')
            .insert(paymentEntries.map(([methodId, amount]) => ({
                cash_register_id: registerId,
                company_id: companyId,
                type: 'entry',
                amount,
                payment_method_id: methodId,
                transaction_type_id: transType?.id,
                description: paymentEntries.length > 1
                    ? `Venda PDV - ID: ${sale.id.substring(0, 8)} (${methodById.get(methodId)?.name})`
                    : `Venda PDV - ID: ${sale.id.substring(0, 8)}`,
                source_type: 'product_sale',
                source_id: sale.id,
                user_id: dbUser.id
            })))

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
                    payment_method_id: primaryMethodId,
                    description: `Custo Produtos - Venda ID: ${sale.id.substring(0, 8)}`,
                    source_type: 'product_sale',
                    source_id: sale.id,
                    user_id: dbUser.id
                })

            if (costError) console.error('Error creating cost transaction:', costError)
        }

        // 6. Register Payment (Financial History), one row per method

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
            .insert(paymentEntries.map(([methodId, amount]) => ({
                company_id: companyId,
                customer_id: saleData.customer_id || null,
                amount,
                payment_method: methodMap[methodById.get(methodId)?.code || ''] || 'dinheiro',
                payment_status: 'completed',
                payment_date: new Date().toISOString(),
                reference_id: sale.id,
                sale_id: sale.id,
                notes: `Venda PDV - ID: ${sale.id.substring(0, 8)}`,
                created_by: dbUser.id
            })))

        if (paymentError) console.error('Error creating payment record:', paymentError)

        return NextResponse.json(sale, { status: 201 })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
