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
        let catalogSettings: any = null

        // 1. Try finding by custom catalog_settings slug
        const { data: settingsBySlug } = await db
            .from('catalog_settings')
            .select('*, companies(name, cnpj, city, state, phone, address, logo_url, email)')
            .eq('slug', slug)
            .single()

        if (settingsBySlug && settingsBySlug.companies) {
            companyId = settingsBySlug.company_id
            companyData = settingsBySlug.companies
            catalogSettings = settingsBySlug
        } else {
            // 2. Fetch all companies and find matching slug or ID
            const { data: companies } = await db
                .from('companies')
                .select('id, name, cnpj, city, state, phone, address, logo_url, email')

            if (companies && companies.length > 0) {
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
                    companyId = companies[0].id
                    companyData = companies[0]
                }
            }

            if (companyId) {
                const { data: cSettings } = await db
                    .from('catalog_settings')
                    .select('*')
                    .eq('company_id', companyId)
                    .single()
                if (cSettings) catalogSettings = cSettings
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
        const matchedSlug = catalogSettings?.slug || rawName
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
                catalog_title: catalogSettings?.catalog_title || `Catálogo Oficial • ${companyData.name}`,
                whatsapp_number: catalogSettings?.whatsapp_number || companyData.phone,
                whatsapp_custom_message: catalogSettings?.whatsapp_custom_message || 'Olá! Vi no seu catálogo e gostaria de comprar o produto.',
                announcement_bar: catalogSettings?.announcement_bar || '⚡ Frete Rápido via Motoboy & Garantia em todos os celulares!',
                warranty_text: catalogSettings?.warranty_text || 'Garantia da Loja inclusa em todos os aparelhos',
                delivery_text: catalogSettings?.delivery_text || 'Entrega rápida via Motoboy ou retirada em mãos',
                payment_methods_text: catalogSettings?.payment_methods_text || 'Até 12x no cartão de crédito ou PIX com desconto',
                device_condition_mode: catalogSettings?.device_condition_mode || 'todos',
                theme: catalogSettings?.theme || {
                    primary: '#10B981',
                    accent: '#34D399',
                    background: '#0A0D14',
                    card_bg: '#111622'
                },
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
