import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'

export async function GET(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId } = ctx

    try {
        const { data, error } = await db
            .from('device_trade_ins')
            .select('*')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false })

        if (error) return NextResponse.json([])
        return NextResponse.json(data || [])
    } catch (err: any) {
        return NextResponse.json([])
    }
}

export async function POST(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId, dbUser } = ctx
    const body = await req.json()

    if (!body.customer_name || !body.device_model || body.offered_price === undefined) {
        return NextResponse.json({ error: 'Nome do cliente, Modelo do Aparelho e Valor são obrigatórios.' }, { status: 400 })
    }

    try {
        const { data, error } = await db
            .from('device_trade_ins')
            .insert({
                company_id: companyId,
                user_id: dbUser?.id || null,
                customer_name: body.customer_name,
                customer_cpf: body.customer_cpf || null,
                customer_phone: body.customer_phone || null,
                device_model: body.device_model,
                imei: body.imei || null,
                assessment_checklist: body.assessment_checklist || {},
                offered_price: Number(body.offered_price),
                status: body.status || 'avaliado',
                notes: body.notes || null
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating trade-in assessment:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data, { status: 201 })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
