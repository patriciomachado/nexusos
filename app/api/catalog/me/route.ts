import { NextRequest, NextResponse } from 'next/server'
import { getContext } from '@/lib/security'
import { createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
    const ctx = await getContext()
    const db = createAdminClient()

    try {
        let companyId = ctx?.companyId
        let companyData = (ctx?.dbUser as any)?.company

        // If no context, find the first active company in DB as fallback
        if (!companyId) {
            const { data: firstCompany } = await db
                .from('companies')
                .select('id, name, cnpj, city, state, phone, address, logo_url, email')
                .limit(1)
                .single()

            if (firstCompany) {
                companyId = firstCompany.id
                companyData = firstCompany
            }
        } else if (!companyData) {
            const { data: comp } = await db
                .from('companies')
                .select('id, name, cnpj, city, state, phone, address, logo_url, email')
                .eq('id', companyId)
                .single()
            companyData = comp
        }

        if (!companyId || !companyData) {
            return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
        }

        // Generate clean URL slug from company name
        const rawName = companyData.name || 'minha-loja'
        const cleanSlug = rawName
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '') || companyData.id

        // Fetch catalog settings if exists
        const { data: settings } = await db
            .from('catalog_settings')
            .select('*')
            .eq('company_id', companyId)
            .single()

        const finalSlug = settings?.slug || cleanSlug

        // Fetch devices for this company
        const { data: devices } = await db
            .from('devices')
            .select('*')
            .eq('company_id', companyId)
            .eq('status', 'disponivel')
            .order('created_at', { ascending: false })

        // Fetch inventory accessories
        const { data: inventory } = await db
            .from('inventory_items')
            .select('id, name, category, sale_price, quantity_in_stock, description, image_url')
            .eq('company_id', companyId)
            .gt('quantity_in_stock', 0)
            .order('name', { ascending: true })
            .limit(100)

        return NextResponse.json({
            slug: finalSlug,
            company_id: companyId,
            share_url: `https://nexusgestor.com/loja/${finalSlug}`,
            settings: {
                catalog_title: settings?.catalog_title || `Catálogo Oficial • ${companyData.name}`,
                whatsapp_number: settings?.whatsapp_number || companyData.phone,
                companies: companyData
            },
            devices: devices || [],
            inventory: inventory || []
        })
    } catch (err: any) {
        console.error('Exception in catalog me API:', err)
        return NextResponse.json({ error: 'Erro ao carregar catálogo da empresa' }, { status: 500 })
    }
}
