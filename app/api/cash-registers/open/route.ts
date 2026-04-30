import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { cashRegisterOpenSchema } from '@/lib/validations/schemas'

export async function POST(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId, dbUser } = ctx

    // Check if there's already an open cash register for this company
    const { data: openRegisters, error: checkError } = await db
        .from('cash_registers')
        .select('id')
        .eq('company_id', companyId)
        .eq('status', 'open')

    if (checkError) {
        return NextResponse.json({ error: 'Erro ao verificar caixa: ' + checkError.message }, { status: 500 })
    }

    if (openRegisters && openRegisters.length > 0) {
        // Auto-close any orphaned registers to prevent system deadlocks
        await db
            .from('cash_registers')
            .update({ 
                status: 'closed', 
                closed_at: new Date().toISOString(),
                closing_balance: 0,
                final_balance: 0
            })
            .in('id', openRegisters.map(r => r.id))
            .eq('company_id', companyId)
    }

    const body = await req.json()
    const validation = cashRegisterOpenSchema.safeParse(body)
    
    if (!validation.success) {
        return NextResponse.json({ error: validation.error.format() }, { status: 400 })
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
