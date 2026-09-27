import { NextRequest, NextResponse } from 'next/server'
import { forbiddenResponse, getContext, unauthorizedResponse } from '@/lib/security'
import { isManager, isOwner } from '@/lib/cash/server'
import { accessToken, deleteReply, friendlyError, getConnection, ownsReview, replyReview } from '@/lib/google/business'

/** Publishes (or edits) the store's public answer to a Google review. */
export async function PUT(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isManager(ctx.role) && !isOwner(ctx.role)) return forbiddenResponse()
    const body = await req.json().catch(() => ({})) as { name?: string; comment?: string }
    const comment = String(body.comment ?? '').trim()
    if (!comment) return NextResponse.json({ error: 'Escreva a resposta.' }, { status: 400 })
    if (comment.length > 4000) return NextResponse.json({ error: 'Resposta longa demais (máximo de 4.000 caracteres).' }, { status: 400 })

    const conn = await getConnection(ctx.db, ctx.companyId)
    if (!conn || !ownsReview(conn, String(body.name))) return NextResponse.json({ error: 'Avaliação não encontrada.' }, { status: 404 })
    try {
        const reply = await replyReview(await accessToken(ctx.db, conn), String(body.name), comment)
        return NextResponse.json({ reply: { comment: reply.comment, updated_at: reply.updateTime } })
    } catch (err) {
        return NextResponse.json({ error: friendlyError(err) }, { status: 502 })
    }
}

export async function DELETE(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    if (!isManager(ctx.role) && !isOwner(ctx.role)) return forbiddenResponse()
    const name = req.nextUrl.searchParams.get('name') ?? ''
    const conn = await getConnection(ctx.db, ctx.companyId)
    if (!conn || !ownsReview(conn, name)) return NextResponse.json({ error: 'Avaliação não encontrada.' }, { status: 404 })
    try {
        await deleteReply(await accessToken(ctx.db, conn), name)
        return NextResponse.json({ ok: true })
    } catch (err) {
        return NextResponse.json({ error: friendlyError(err) }, { status: 502 })
    }
}
