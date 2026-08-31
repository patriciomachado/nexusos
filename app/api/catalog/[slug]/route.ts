import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params
    const db = createAdminClient()

    try {
        // 1. Find catalog settings by slug or company ID
        let { data: settings } = await db
            .from('catalog_settings')
            .select('*, companies(name, city, phone, logo_url)')
            .eq('slug', slug)
            .single()

        // Fallback: If not found by slug, search company ID directly
        if (!settings) {
            const { data: company } = await db
                .from('companies')
                .select('id, name, city, phone, logo_url')
                .eq('id', slug)
                .single()

            if (company) {
                settings = {
                    id: company.id,
                    company_id: company.id,
                    slug: company.id,
                    catalog_title: `Catálogo Oficial - ${company.name}`,
                    whatsapp_number: company.phone,
                    is_active: true,
                    companies: company
                }
            }
        }

        if (!settings) {
            return NextResponse.json({ error: 'Catálogo não encontrado' }, { status: 404 })
        }

        const companyId = settings.company_id

        // 2. Fetch available devices
        const { data: devices } = await db
            .from('devices')
            .select('*')
            .eq('company_id', companyId)
            .eq('status', 'disponivel')
            .order('created_at', { ascending: false })

        // 3. Fetch products from inventory (with quantity > 0)
        const { data: inventory } = await db
            .from('inventory_items')
            .select('id, name, category, sale_price, quantity_in_stock, description, image_url')
            .eq('company_id', companyId)
            .gt('quantity_in_stock', 0)
            .order('name', { ascending: true })
            .limit(100)

        return NextResponse.json({
            settings,
            devices: devices || [],
            inventory: inventory || []
        })
    } catch (err: any) {
        console.error('Exception in public catalog API:', err)
        return NextResponse.json({ error: 'Erro ao carregar catálogo' }, { status: 500 })
    }
}
