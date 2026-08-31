import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params
    const db = createAdminClient()

    try {
        let companyId: string | null = null
        let companyData: any = null

        // 1. Try finding by custom catalog_settings slug
        const { data: settings } = await db
            .from('catalog_settings')
            .select('*, companies(name, cnpj, city, state, phone, address, logo_url, email)')
            .eq('slug', slug)
            .single()

        if (settings && settings.companies) {
            companyId = settings.company_id
            companyData = settings.companies
        } else {
            // 2. Fetch all companies and find matching slug or ID
            const { data: companies } = await db
                .from('companies')
                .select('id, name, cnpj, city, state, phone, address, logo_url, email')

            if (companies && companies.length > 0) {
                // Find matching company by ID or slug derived from name
                const matched = companies.find(c => {
                    if (c.id === slug) return true
                    const cleanSlug = c.name
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/(^-|-$)+/g, '')
                    return cleanSlug === slug
                })

                if (matched) {
                    companyId = matched.id
                    companyData = matched
                } else {
                    // Fallback to first company
                    companyId = companies[0].id
                    companyData = companies[0]
                }
            }
        }

        if (!companyId || !companyData) {
            return NextResponse.json({ error: 'Catálogo não encontrado' }, { status: 404 })
        }

        // Fetch ONLY public customer-facing device fields (Sanitizing cost_price and IMEIs)
        const { data: devices } = await db
            .from('devices')
            .select('id, brand, model, storage, color, condition, battery_health, cash_price, installment_price, status, included_items, images, technical_passport, created_at')
            .eq('company_id', companyId)
            .eq('status', 'disponivel')
            .order('created_at', { ascending: false })

        // Fetch inventory accessories for this company
        const { data: inventory } = await db
            .from('inventory_items')
            .select('id, name, category, sale_price, quantity_in_stock, description, image_url')
            .eq('company_id', companyId)
            .gt('quantity_in_stock', 0)
            .order('name', { ascending: true })
            .limit(100)

        const rawName = companyData.name || 'minha-loja'
        const matchedSlug = rawName
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '') || companyData.id

        return NextResponse.json({
            slug: matchedSlug,
            company_id: companyId,
            share_url: `https://nexusgestor.com/loja/${matchedSlug}`,
            settings: {
                catalog_title: `Catálogo Oficial • ${companyData.name}`,
                whatsapp_number: companyData.phone,
                companies: companyData
            },
            devices: devices || [],
            inventory: inventory || []
        })
    } catch (err: any) {
        console.error('Exception in public catalog API:', err)
        return NextResponse.json({ error: 'Erro ao carregar catálogo' }, { status: 500 })
    }
}
