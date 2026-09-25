import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { companyHasFeature, planRequiredResponse } from '@/lib/plan-server'

export async function GET(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!await companyHasFeature(ctx.db, ctx.companyId, 'studio')) return planRequiredResponse('studio')

    const { db, companyId } = ctx
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')

    try {
        let query = db
            .from('studio_scripts')
            .select('*')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false })

        if (category) {
            query = query.eq('category', category)
        }

        const { data, error } = await query.limit(100)

        if (error) {
            console.error('Error fetching studio scripts:', error)
            return NextResponse.json([])
        }
        return NextResponse.json(data || [])
    } catch (err: any) {
        console.error('Exception fetching studio scripts:', err)
        return NextResponse.json([])
    }
}

export async function POST(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!await companyHasFeature(ctx.db, ctx.companyId, 'studio')) return planRequiredResponse('studio')

    const { db, companyId, dbUser } = ctx
    const body = await req.json()

    if (!body.title || !body.hook_3s || !body.body_script) {
        return NextResponse.json({ error: 'Título, Gancho e Roteiro são obrigatórios.' }, { status: 400 })
    }

    try {
        const userIdVal = dbUser?.id || null

        const { data, error } = await db
            .from('studio_scripts')
            .insert({
                company_id: companyId,
                user_id: userIdVal,
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

        if (error) {
            console.error('Error inserting studio script:', error)
            return NextResponse.json({ 
                error: 'Erro ao salvar no banco. ' + error.message, 
                details: error 
            }, { status: 500 })
        }

        return NextResponse.json(data, { status: 201 })
    } catch (err: any) {
        console.error('Exception inserting studio script:', err)
        return NextResponse.json({ error: 'Erro interno ao salvar roteiro: ' + (err.message || 'Erro desconhecido') }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!await companyHasFeature(ctx.db, ctx.companyId, 'studio')) return planRequiredResponse('studio')

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })

    try {
        const { error } = await ctx.db
            .from('studio_scripts')
            .delete()
            .eq('id', id)
            .eq('company_id', ctx.companyId)

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
