import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { requireAliceAdmin } from '@/lib/alice/access'
import { bad } from '@/lib/alice/suite/api'
import type { OutboundMediaType } from '@/lib/alice/gateway'

const MAX_BYTES = 16 * 1024 * 1024
const BUCKET = 'product-images'

function kindOf(mime: string): OutboundMediaType | null {
    if (/^image\/(jpeg|png|webp|gif)$/.test(mime)) return 'image'
    if (/^video\/(mp4|3gpp|quicktime)$/.test(mime)) return 'video'
    if (/^audio\/(mpeg|ogg|mp4|aac|amr|wav)$/.test(mime)) return 'audio'
    if (mime === 'application/pdf' || /^application\/(msword|vnd\.|zip)/.test(mime) || mime === 'text/plain' || mime === 'text/csv') return 'document'
    return null
}

/** Uploads an attachment (image, video, audio, PDF…) for replies, scheduled messages and broadcasts. */
export async function POST(req: NextRequest) {
    const access = await requireAliceAdmin()
    if (access.response) return access.response
    const { ctx } = access
    const form = await req.formData().catch(() => null)
    const file = form?.get('file')
    if (!(file instanceof File)) return bad('Escolha um arquivo.')
    if (file.size > MAX_BYTES) return bad('O arquivo passa de 16 MB (limite do WhatsApp para a maioria dos aparelhos).')
    const type = kindOf(file.type)
    if (!type) return bad('Tipo de arquivo não aceito. Use imagem, vídeo, áudio, PDF ou documento do Office.')
    const ext = (file.name.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin'
    const path = `alice/${ctx.companyId}/${crypto.randomUUID()}.${ext}`
    const { error } = await ctx.db.storage.from(BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type })
    if (error) {
        console.error('[alice] media upload failed:', error)
        return bad('Não foi possível enviar o arquivo.', 500)
    }
    return NextResponse.json({ url: ctx.db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl, type, name: file.name.slice(0, 150) })
}
