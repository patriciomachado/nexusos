import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const db = createAdminClient()
    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId).single()
    if (!user?.company_id) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

    // Fetch from product_categories
    const { data: catData } = await db
        .from('product_categories')
        .select('*')
        .eq('company_id', user.company_id)
        .order('name', { ascending: true })

    // Fetch unique categories from inventory_items
    const { data: itemCategories } = await db
        .from('inventory_items')
        .select('category')
        .eq('company_id', user.company_id)
        .not('category', 'is', null)

    const uniqueItemCategories = Array.from(new Set(itemCategories?.map(i => i.category)))
    
    // Merge them
    const allCategories = [...(catData || [])]
    uniqueItemCategories.forEach(name => {
        if (name && !allCategories.find(c => c.name === name)) {
            allCategories.push({
                id: name,
                name: name,
                company_id: user.company_id
            })
        }
    })

    return NextResponse.json(allCategories)
}
