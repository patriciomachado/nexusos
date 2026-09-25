import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'
import { companyUpdateSchema, idSchema } from '@/lib/validations/schemas'

type P = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: P) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { id } = await params
    const { db, companyId } = ctx

    if (id !== companyId) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { data, error } = await db
        .from('companies')
        .select('*')
        .eq('id', id)
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function PUT(req: NextRequest, { params }: P) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    
    const { id } = await params
    const { db, companyId } = ctx
    
    if (id !== companyId) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await req.json()
    const validation = companyUpdateSchema.safeParse(body)
    if (!validation.success) {
        return NextResponse.json({ error: validation.error.format() }, { status: 400 })
    }

    // settings is a JSON object shared by several screens: merge, never replace.
    const update: Record<string, unknown> = { ...validation.data }
    if (validation.data.settings) {
        const { data: current } = await db.from('companies').select('settings').eq('id', id).single()
        update.settings = { ...((current?.settings as Record<string, unknown> | null) ?? {}), ...validation.data.settings }
    }

    const { data, error } = await db
        .from('companies')
        .update(update)
        .eq('id', id)
        .select()
        .single()
        
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

