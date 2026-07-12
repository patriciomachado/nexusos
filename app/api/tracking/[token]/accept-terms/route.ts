import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { rateLimit, getClientIp } from '@/lib/security-rate-limit'

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    const ip = getClientIp(req)
    if (!rateLimit('accept-terms', 5, 60000, ip)) {
        return NextResponse.json({ error: 'Muitas solicitações. Por favor, tente novamente mais tarde.' }, { status: 429 })
    }

    const { token } = await params
    const db = createAdminClient()

    // 1. Verify OS and Token
    const { data: os, error: fetchError } = await db
        .from('service_orders')
        .select('id, terms_accepted, signature_url')
        .eq('tracking_token', token)
        .single()

    if (fetchError || !os) {
        return NextResponse.json({ error: 'OS não encontrada ou link inválido' }, { status: 404 })
    }

    if (os.terms_accepted && os.signature_url) {
        return NextResponse.json({ success: true, message: 'Termos já aceitos e assinados' })
    }

    // Parse request body for signature
    let signatureUrl = os.signature_url
    try {
        const body = await req.json()
        const { signature } = body

        if (signature && typeof signature === 'string' && signature.startsWith('data:image/')) {
            const base64Data = signature.replace(/^data:image\/\w+;base64,/, "")
            const buffer = Buffer.from(base64Data, 'base64')
            const fileName = `signatures/${os.id}-${Date.now()}.png`

            const { data: uploadData, error: uploadError } = await db.storage
                .from('os-photos')
                .upload(fileName, buffer, {
                    contentType: 'image/png',
                    upsert: true
                })

            if (uploadError) {
                console.error('Error uploading signature to Storage:', uploadError)
                return NextResponse.json({ error: 'Erro ao salvar a imagem da assinatura' }, { status: 500 })
            }

            const { data: { publicUrl } } = db.storage.from('os-photos').getPublicUrl(uploadData.path)
            signatureUrl = publicUrl
        }
    } catch (parseError) {
        console.error('Error parsing body or handling signature:', parseError)
    }

    // 2. Update terms_accepted and signature_url
    const { error: updateError } = await db
        .from('service_orders')
        .update({
            terms_accepted: true,
            signature_url: signatureUrl,
            updated_at: new Date().toISOString()
        })
        .eq('id', os.id)

    if (updateError) {
        return NextResponse.json({ error: 'Erro ao aceitar termos e salvar assinatura' }, { status: 500 })
    }

    // 3. Log history
    await db.from('service_order_history').insert({
        service_order_id: os.id,
        changed_by_name: 'Cliente (via Link)',
        field_name: 'terms_accepted',
        old_value: os.terms_accepted ? 'true' : 'false',
        new_value: 'true',
        change_reason: signatureUrl 
            ? 'Aceito e assinado digitalmente pelo cliente no portal de acompanhamento'
            : 'Aceito pelo cliente no portal de acompanhamento',
    })

    return NextResponse.json({ success: true })
}
