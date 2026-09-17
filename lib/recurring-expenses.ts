export async function processRecurringExpenses(
    db: any,
    companyId: string,
    cashRegisterId: string,
    userId: string
) {
    try {
        const now = new Date()
        const currentDay = now.getDate()
        const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

        // 1. Fetch active recurring expenses for this company where day_of_month <= currentDay
        const { data: recurringExpenses, error: reqError } = await db
            .from('recurring_expenses')
            .select('*')
            .eq('company_id', companyId)
            .eq('is_active', true)
            .lte('day_of_month', currentDay)

        if (reqError || !recurringExpenses || recurringExpenses.length === 0) {
            return
        }

        // 2. Fetch active payment methods for fallback if expense has no payment_method_id
        let defaultPaymentMethodId: string | null = null
        const { data: paymentMethods } = await db
            .from('payment_methods')
            .select('id, name, code')

        if (paymentMethods && paymentMethods.length > 0) {
            const moneyPm = paymentMethods.find(
                (p: any) => p.code?.toLowerCase() === 'dinheiro' || p.name?.toLowerCase().includes('dinheiro')
            )
            defaultPaymentMethodId = moneyPm ? moneyPm.id : paymentMethods[0].id
        }

        // 3. Fetch expenses already marked as applied to this register
        const { data: applied } = await db
            .from('applied_recurring_expenses')
            .select('recurring_expense_id')
            .eq('cash_register_id', cashRegisterId)

        const appliedSet = new Set(applied?.map((a: any) => a.recurring_expense_id))

        // 4. Fetch existing cash_transactions for this register to prevent double entry
        const { data: existingTx } = await db
            .from('cash_transactions')
            .select('description, source_id')
            .eq('cash_register_id', cashRegisterId)
            .eq('source_type', 'recurring_expense')

        const existingDescriptions = new Set(existingTx?.map((t: any) => t.description))
        const existingSourceIds = new Set(existingTx?.filter((t: any) => t.source_id).map((t: any) => t.source_id))

        for (const expense of recurringExpenses) {
            const expectedDescription = `[Fixa] ${expense.description}`

            // Skip if already applied to this register
            if (appliedSet.has(expense.id) || existingDescriptions.has(expectedDescription) || existingSourceIds.has(expense.id)) {
                continue
            }

            const pmId = expense.payment_method_id || defaultPaymentMethodId
            if (!pmId) {
                console.error(`Cannot process recurring expense ${expense.id}: No valid payment method found`)
                continue
            }

            // Insert cash transaction exit
            const { error: txError } = await db
                .from('cash_transactions')
                .insert({
                    company_id: companyId,
                    cash_register_id: cashRegisterId,
                    description: expectedDescription,
                    amount: expense.amount,
                    type: 'exit',
                    transaction_type_id: expense.transaction_type_id || null,
                    payment_method_id: pmId,
                    source_type: 'recurring_expense',
                    source_id: expense.id,
                    user_id: userId
                })

            if (!txError) {
                // Record in applied_recurring_expenses
                const fullRecord = {
                    recurring_expense_id: expense.id,
                    cash_register_id: cashRegisterId,
                    month_year: currentMonthYear,
                    company_id: companyId
                }

                const { error: appErr } = await db
                    .from('applied_recurring_expenses')
                    .insert(fullRecord)

                if (appErr) {
                    // Fallback to minimal schema if migration hasn't run yet
                    await db
                        .from('applied_recurring_expenses')
                        .insert({
                            recurring_expense_id: expense.id,
                            cash_register_id: cashRegisterId
                        })
                }
            } else {
                console.error('Failed to insert transaction for recurring expense', expense.id, txError)
            }
        }
    } catch (err) {
        console.error('Error in processRecurringExpenses:', err)
    }
}
