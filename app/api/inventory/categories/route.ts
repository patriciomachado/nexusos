import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'

export async function GET(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId } = ctx

    // Fetch from product_categories
    const { data: catData } = await db
        .from('product_categories')
        .select('*')
        .eq('company_id', companyId)
        .order('name', { ascending: true })

    // Fetch unique categories from inventory_items
    const { data: itemCategories } = await db
        .from('inventory_items')
        .select('category')
        .eq('company_id', companyId)
        .not('category', 'is', null)

    const uniqueItemCategories = Array.from(new Set(itemCategories?.map(i => i.category)))
    
    // Merge them
    const allCategories = [...(catData || [])]
    uniqueItemCategories.forEach(name => {
        if (name && !allCategories.find(c => c.name === name)) {
            allCategories.push({
                id: name,
                name: name,
                company_id: companyId
            })
        }
    })

    return NextResponse.json(allCategories)
}

export async function POST(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId } = ctx
    const body = await req.json()

    if (!body.name) {
        return NextResponse.json({ error: 'Nome da categoria é obrigatório' }, { status: 400 })
    }

    const { data, error } = await db
        .from('product_categories')
        .insert({
            name: body.name,
            company_id: companyId
        })
        .select()
        .single()

    if (error) {
        // Handle unique constraint or other errors
        if (error.code === '23505') {
            return NextResponse.json({ error: 'Categoria já existe' }, { status: 400 })
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
}

