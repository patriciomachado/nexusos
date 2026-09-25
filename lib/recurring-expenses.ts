import type { SupabaseClient } from '@supabase/supabase-js'
import { dateStringInZone, DEFAULT_TIMEZONE } from '@/lib/tasks/dates'

interface RecurringExpense {
    id: string
    description: string
    amount: number
    day_of_month: number
    transaction_type_id: string | null
    payment_method_id: string | null
}

/** Day an expense is due this month: day 31 falls on the 30th, 28th or 29th in shorter months. */
function dueDay(dayOfMonth: number, year: number, month: number) {
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
    return Math.min(dayOfMonth, lastDay)
}

/**
 * Posts each active recurring expense as a cash exit ("[Fixa] …") once per
 * month, on or after its day, into the open cash register.
 *
 * - Dates follow the store's time zone (Brasília), not the server's UTC clock.
 * - "Once per month" is checked against the month, not the register, so a
 *   daily cash cycle doesn't post the same bill every day.
 * - The applied row is written first as a claim, so two requests arriving
 *   together (opening the register + loading the page) can't post it twice.
 */
export async function processRecurringExpenses(
    db: SupabaseClient,
    companyId: string,
    cashRegisterId: string,
    userId: string
) {
    try {
        const today = dateStringInZone(DEFAULT_TIMEZONE) // YYYY-MM-DD
        const year = Number(today.slice(0, 4))
        const month = Number(today.slice(5, 7))
        const day = Number(today.slice(8, 10))
        const monthYear = today.slice(0, 7)
        // Start of this month in Brasília (UTC-3, no DST since 2019).
        const monthStart = new Date(`${monthYear}-01T00:00:00-03:00`).toISOString()

        const { data: expenses, error } = await db
            .from('recurring_expenses')
            .select('id, description, amount, day_of_month, transaction_type_id, payment_method_id')
            .eq('company_id', companyId)
            .eq('is_active', true)
        if (error) {
            console.error('[recurring] could not load expenses:', error)
            return
        }
        const due = ((expenses ?? []) as RecurringExpense[]).filter(e => dueDay(e.day_of_month, year, month) <= day)
        if (!due.length) return

        // Already posted this month (in any register)?
        const ids = due.map(e => e.id)
        const [{ data: postedTx }, { data: appliedRows }] = await Promise.all([
            db.from('cash_transactions')
                .select('source_id')
                .eq('source_type', 'recurring_expense')
                .in('source_id', ids)
                .gte('created_at', monthStart),
            db.from('applied_recurring_expenses')
                .select('recurring_expense_id')
                .in('recurring_expense_id', ids)
                .eq('month_year', monthYear),
        ])
        const done = new Set<string>([
            ...(postedTx ?? []).map(t => t.source_id as string),
            ...(appliedRows ?? []).map(a => a.recurring_expense_id as string),
        ])
        const pending = due.filter(e => !done.has(e.id))
        if (!pending.length) return

        // Fallback payment method: cash ("dinheiro"), else the first one.
        let defaultPaymentMethodId: string | null = null
        if (pending.some(e => !e.payment_method_id)) {
            const { data: methods } = await db.from('payment_methods').select('id, name, code')
            const cash = methods?.find(p => p.code?.toLowerCase() === 'dinheiro' || p.code?.toLowerCase() === 'cash' || p.name?.toLowerCase().includes('dinheiro'))
            defaultPaymentMethodId = cash?.id ?? methods?.[0]?.id ?? null
        }

        for (const expense of pending) {
            const paymentMethodId = expense.payment_method_id || defaultPaymentMethodId
            if (!paymentMethodId) {
                console.error(`[recurring] no payment method for expense ${expense.id}`)
                continue
            }

            // Claim: the (expense, register) pair is unique, so only one request wins.
            const { data: claim, error: claimError } = await db
                .from('applied_recurring_expenses')
                .insert({ recurring_expense_id: expense.id, cash_register_id: cashRegisterId, month_year: monthYear, company_id: companyId })
                .select('id')
                .single()
            if (claimError || !claim) {
                if (claimError?.code !== '23505') console.error('[recurring] claim failed:', expense.id, claimError)
                continue
            }

            const { error: txError } = await db.from('cash_transactions').insert({
                company_id: companyId,
                cash_register_id: cashRegisterId,
                description: `[Fixa] ${expense.description}`,
                amount: expense.amount,
                type: 'exit',
                transaction_type_id: expense.transaction_type_id || null,
                payment_method_id: paymentMethodId,
                source_type: 'recurring_expense',
                source_id: expense.id,
                user_id: userId,
            })
            if (txError) {
                console.error('[recurring] could not post expense', expense.id, txError)
                // Release the claim so the next load tries again.
                await db.from('applied_recurring_expenses').delete().eq('id', claim.id)
            }
        }
    } catch (err) {
        console.error('[recurring] unexpected error:', err)
    }
}
