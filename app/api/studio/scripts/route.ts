import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'

export async function GET(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId } = ctx
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')

    let query = db
        .from('studio_scripts')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

    if (category) {
        query = query.eq('category', category)
    }

    const { data, error } = await query.limit(100)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId, dbUser } = ctx
    const body = await req.json()

    if (!body.title || !body.hook_3s || !body.body_script) {
        return NextResponse.json({ error: 'Título, Gancho e Roteiro são obrigatórios.' }, { status: 400 })
    }

    const { data, error } = await db
        .from('studio_scripts')
        .insert({
            company_id: companyId,
            user_id: dbUser.id,
            title: body.title,
            category: body.category || 'Geral',
            source_type: body.source_type || 'manual',
            source_id: body.source_id || null,
            hook_3s: body.hook_3s,
            body_script: body.body_script,
            cta_text: body.cta_text || '',
            instagram_caption: body.instagram_caption || '',
            whatsapp_text: body.whatsapp_text || '',
            google_post: body.google_post || '',
            banner_prompt: body.banner_prompt || null,
            is_favorite: body.is_favorite || false
        })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })

    const { error } = await ctx.db
        .from('studio_scripts')
        .delete()
        .eq('id', id)
        .eq('company_id', ctx.companyId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
