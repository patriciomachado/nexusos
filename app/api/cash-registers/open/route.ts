import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { cashRegisterOpenSchema } from '@/lib/validations/schemas'

/**
 * Opens a register for the signed-in user. Each operator has their own
 * register; only this user's leftover open register is closed first.
 */
export async function POST(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId, dbUser } = ctx

    const body = await req.json()
    const validation = cashRegisterOpenSchema.safeParse(body)
    if (!validation.success) {
        return NextResponse.json({ error: validation.error.format() }, { status: 400 })
    }

    const { data: mine, error: checkError } = await db
        .from('cash_registers')
        .select('id')
        .eq('company_id', companyId)
        .eq('user_id', dbUser.id)
        .eq('status', 'open')

    if (checkError) {
        return NextResponse.json({ error: 'Erro ao verificar caixa: ' + checkError.message }, { status: 500 })
    }
    if (mine && mine.length > 0) {
        return NextResponse.json({ error: 'Você já tem um caixa aberto. Feche-o antes de abrir outro.' }, { status: 409 })
    }

    const { data, error } = await db
        .from('cash_registers')
        .insert({
            user_id: dbUser.id,
            company_id: companyId,
            opening_balance: validation.data.opening_balance,
            status: 'open',
            opened_at: new Date().toISOString()
        })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
}
