import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params
    const db = createAdminClient()

    // 1. Verify OS and Token
    const { data: os, error: fetchError } = await db
        .from('service_orders')
        .select('id, terms_accepted')
        .eq('tracking_token', token)
        .single()

    if (fetchError || !os) {
        return NextResponse.json({ error: 'OS não encontrada ou link inválido' }, { status: 404 })
    }

    if (os.terms_accepted) {
        return NextResponse.json({ success: true, message: 'Termos já aceitos' })
    }

    // 2. Update terms_accepted
    const { error: updateError } = await db
        .from('service_orders')
        .update({
            terms_accepted: true,
            updated_at: new Date().toISOString()
        })
        .eq('id', os.id)

    if (updateError) {
        return NextResponse.json({ error: 'Erro ao aceitar termos' }, { status: 500 })
    }

    // 3. Log history
    await db.from('service_order_history').insert({
        service_order_id: os.id,
        changed_by_name: 'Cliente (via Link)',
        field_name: 'terms_accepted',
        old_value: 'false',
        new_value: 'true',
        change_reason: 'Aceito pelo cliente no portal de acompanhamento',
    })

    return NextResponse.json({ success: true })
}
