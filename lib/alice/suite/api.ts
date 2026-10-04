import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { MEDIA_TYPES } from './media'

/** Shared bits of the Central de WhatsApp API routes. */
export const uuid = z.string().uuid()

export function bad(message: string, status = 400) {
    return NextResponse.json({ error: message }, { status })
}

export function firstIssue(err: z.ZodError) {
    return err.issues[0]?.message ?? 'Dados inválidos.'
}

/** Only files this app uploaded (public bucket under alice/<company>/) may be attached: no arbitrary URLs for the server to fetch. */
export function ownMediaUrl(url: string, companyId: string) {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
    return !!base && url.startsWith(`${base}/storage/v1/object/public/product-images/alice/${companyId}/`)
}

export const mediaFields = {
    media_url: z.string().url().max(500).nullable().optional(),
    media_type: z.enum(MEDIA_TYPES as [string, ...string[]]).nullable().optional(),
    media_name: z.string().trim().max(150).nullable().optional(),
}

export const ruleSchema = z.object({
    keyword: z.string().trim().min(1, 'Informe a palavra-chave.').max(200),
    match_type: z.enum(['exact', 'contains', 'regex']).default('contains'),
    response: z.string().trim().max(4000).nullable().optional(),
    trigger_type: z.enum(['all', 'private', 'group']).default('private'),
    enabled: z.boolean().optional(),
    ...mediaFields,
})

export const labelSchema = z.object({
    name: z.string().trim().min(1, 'Dê um nome à etiqueta.').max(40),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida.').default('#22c55e'),
})


export const webhookSchema = z.object({
    name: z.string().trim().min(1, 'Dê um nome ao webhook.').max(80),
    url: z.string().trim().url('Endereço inválido.').max(500),
    events: z.array(z.string()).min(1, 'Escolha pelo menos um evento.').max(10),
    enabled: z.boolean().optional(),
})
