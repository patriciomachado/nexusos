import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params
    const db = createAdminClient()

    try {
        // 1. Find catalog settings or company by slug or ID
        let companyId: string | null = null
        let settingsData: any = null

        // Try searching catalog_settings table by slug
        const { data: settings } = await db
            .from('catalog_settings')
            .select('*, companies(name, cnpj, city, state, phone, address, logo_url, email)')
            .eq('slug', slug)
            .single()

        if (settings) {
            settingsData = settings
            companyId = settings.company_id
        } else {
            // Fallback: search company table directly by ID or slug
            const { data: company } = await db
                .from('companies')
                .select('id, name, cnpj, city, state, phone, address, logo_url, email')
                .or(`id.eq.${slug},name.ilike.%${slug}%`)
                .limit(1)
                .single()

            if (company) {
                companyId = company.id
                settingsData = {
                    id: company.id,
                    company_id: company.id,
                    slug: company.id,
                    catalog_title: `Catálogo Oficial • ${company.name}`,
                    whatsapp_number: company.phone,
                    is_active: true,
                    companies: company
                }
            } else {
                // Return default fallback company if none found
                const { data: firstCompany } = await db
                    .from('companies')
                    .select('id, name, cnpj, city, state, phone, address, logo_url, email')
                    .limit(1)
                    .single()

                if (firstCompany) {
                    companyId = firstCompany.id
                    settingsData = {
                        id: firstCompany.id,
                        company_id: firstCompany.id,
                        slug: firstCompany.id,
                        catalog_title: `Catálogo Oficial • ${firstCompany.name}`,
                        whatsapp_number: firstCompany.phone,
                        is_active: true,
                        companies: firstCompany
                    }
                }
            }
        }

        if (!companyId || !settingsData) {
            return NextResponse.json({ error: 'Catálogo não encontrado' }, { status: 404 })
        }

        // 2. Fetch available devices for this company
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
            settings: settingsData,
            devices: devices || [],
            inventory: inventory || []
        })
    } catch (err: any) {
        console.error('Exception in public catalog API:', err)
        return NextResponse.json({ error: 'Erro ao carregar catálogo' }, { status: 500 })
    }
}
