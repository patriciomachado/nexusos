import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function POST(
    req: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params
        const body = await req.json()
        const { rating, comment } = body

        if (!rating || rating < 1 || rating > 5) {
            return NextResponse.json({ error: 'Nota de avaliação inválida.' }, { status: 400 })
        }

        const db = createAdminClient()

        // 1. Find OS by token to verify it exists and is completed
        const { data: os, error: osError } = await db
            .from('service_orders')
            .select('id, company_id, customer_id, technician_id, status')
            .eq('tracking_token', token)
            .single()

        if (osError || !os) {
            return NextResponse.json({ error: 'Ordem de Serviço não encontrada.' }, { status: 404 })
        }

        // Technically, customers shouldn't rate an unfinished OS, but let's allow it if it's "faturada" too
        if (os.status !== 'concluida' && os.status !== 'faturada') {
            return NextResponse.json({ error: 'A Ordem de Serviço ainda não foi finalizada.' }, { status: 400 })
        }

        // 2. Check if a rating already exists
        const { data: existingRating } = await db
            .from('customer_ratings')
            .select('id')
            .eq('service_order_id', os.id)
            .single()

        if (existingRating) {
            return NextResponse.json({ error: 'Você já avaliou esta Ordem de Serviço. Obrigado!' }, { status: 400 })
        }

        // 3. Determine sentiment (primitive logic)
        let sentiment = 'neutral'
        if (rating >= 4) sentiment = 'positive'
        if (rating <= 2) sentiment = 'negative'

        // 4. Insert Rating
        const { error: insertError } = await db
            .from('customer_ratings')
            .insert({
                service_order_id: os.id,
                company_id: os.company_id,
                customer_id: os.customer_id,
                technician_id: os.technician_id,
                rating,
                comment: comment || null,
                sentiment
            })

        if (insertError) {
            console.error('Error inserting rating:', insertError)
            return NextResponse.json({ error: 'Falha ao salvar a avaliação no banco de dados.' }, { status: 500 })
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Rating API Error:', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
