import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'

export async function GET(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId } = ctx

    // Get company settings
    const { data: company, error: companyError } = await db
        .from('companies')
        .select('cash_cycle, auto_close_cash')
        .eq('id', companyId)
        .single()

    if (companyError) return NextResponse.json({ error: companyError.message }, { status: 500 })

    // Find the currently open cash register for this company
    const { data: cashRegister, error } = await db
        .from('cash_registers')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Auto-close logic
    if (cashRegister && company.auto_close_cash) {
        const openedAt = new Date(cashRegister.opened_at)
        const now = new Date()
        let shouldClose = false

        if (company.cash_cycle === 'monthly') {
            // Check if month or year changed
            if (openedAt.getMonth() !== now.getMonth() || openedAt.getFullYear() !== now.getFullYear()) {
                shouldClose = true
            }
        } else {
            // Daily cycle: check if day changed
            if (openedAt.getDate() !== now.getDate() || openedAt.getMonth() !== now.getMonth() || openedAt.getFullYear() !== now.getFullYear()) {
                shouldClose = true
            }
        }

        if (shouldClose) {
            // Close the register
            // We need to calculate the current balance first
            const { data: transactions } = await db
                .from('cash_transactions')
                .select('amount, type')
                .eq('cash_register_id', cashRegister.id)

            let currentBalance = Number(cashRegister.opening_balance)
            transactions?.forEach(tx => {
                if (tx.type === 'entry') currentBalance += Number(tx.amount)
                else currentBalance -= Number(tx.amount)
            })

            const { error: closeError } = await db
                .from('cash_registers')
                .update({
                    status: 'closed',
                    closed_at: now.toISOString(),
                    closing_balance: currentBalance
                })
                .eq('id', cashRegister.id)

            if (!closeError) {
                return NextResponse.json(null, {
                    headers: { 'Cache-Control': 'no-store, max-age=0' }
                })
            }
        }
    }

    // Apply recurring expenses if register is open
    if (cashRegister) {
        const now = new Date()
        const currentDay = now.getDate()
        const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

        // Find active recurring expenses for this company that should have been applied by now
        const { data: recurringExpenses } = await db
            .from('recurring_expenses')
            .select('*')
            .eq('company_id', companyId)
            .eq('is_active', true)
            .lte('day_of_month', currentDay)

        if (recurringExpenses && recurringExpenses.length > 0) {
            // Check which ones are already applied to this month/register
            const { data: applied } = await db
                .from('applied_recurring_expenses')
                .select('recurring_expense_id')
                .eq('month_year', currentMonthYear)
                .eq('company_id', companyId)

            const appliedIds = new Set(applied?.map(a => a.recurring_expense_id))

            for (const expense of recurringExpenses) {
                if (!appliedIds.has(expense.id)) {
                    // Apply expense: Create transaction
                    const { error: txError } = await db
                        .from('cash_transactions')
                        .insert({
                            company_id: companyId,
                            cash_register_id: cashRegister.id,
                            description: `[Fixa] ${expense.description}`,
                            amount: expense.amount,
                            type: 'exit',
                            transaction_type_id: expense.transaction_type_id,
                            payment_method_id: expense.payment_method_id,
                            source_type: 'recurring_expense',
                            user_id: ctx.dbUser.id
                        })

                    if (!txError) {
                        // Mark as applied
                        await db
                            .from('applied_recurring_expenses')
                            .insert({
                                company_id: companyId,
                                cash_register_id: cashRegister.id,
                                recurring_expense_id: expense.id,
                                month_year: currentMonthYear
                            })
                    }
                }
            }
        }
    }

    return NextResponse.json(cashRegister, {
        headers: {
            'Cache-Control': 'no-store, max-age=0'
        }
    })
}

