import { NextRequest, NextResponse } from 'next/server'
import { getContext } from '@/lib/security'
import { createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
    const ctx = await getContext()
    const db = createAdminClient()

    try {
        let companyId = ctx?.companyId
        let companyData = (ctx?.dbUser as any)?.company

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

        const rawName = companyData.name || 'minha-loja'
        const cleanSlug = rawName
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '') || companyData.id

        const { data: settings } = await db
            .from('catalog_settings')
            .select('*')
            .eq('company_id', companyId)
            .maybeSingle()

        const finalSlug = settings?.slug || cleanSlug

        const { data: devices } = await db
            .from('devices')
            .select('*')
            .eq('company_id', companyId)
            .eq('status', 'disponivel')
            .order('created_at', { ascending: false })

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
                whatsapp_custom_message: settings?.whatsapp_custom_message || 'Olá! Vi no seu catálogo e gostaria de comprar o produto.',
                announcement_bar: settings?.announcement_bar || '⚡ Frete Rápido via Motoboy & Garantia em todos os celulares!',
                warranty_text: settings?.warranty_text || 'Garantia da Loja inclusa em todos os aparelhos',
                delivery_text: settings?.delivery_text || 'Entrega rápida via Motoboy ou retirada em mãos',
                payment_methods_text: settings?.payment_methods_text || 'Até 12x no cartão de crédito ou PIX com desconto',
                device_condition_mode: settings?.device_condition_mode || 'todos',
                installment_rate_12x: settings?.installment_rate_12x ?? 10.0,
                installment_rate_24x: settings?.installment_rate_24x ?? 18.0,
                theme: settings?.theme || {
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
        console.error('Exception in catalog me API:', err)
        return NextResponse.json({ error: 'Erro ao carregar catálogo da empresa' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const ctx = await getContext()
    const db = createAdminClient()

    try {
        let companyId = ctx?.companyId

        if (!companyId) {
            const { data: firstCompany } = await db.from('companies').select('id').limit(1).single()
            companyId = firstCompany?.id
        }

        if (!companyId) {
            return NextResponse.json({ error: 'Empresa não identificada' }, { status: 400 })
        }

        const body = await req.json()
        const { 
            slug, catalog_title, announcement_bar, whatsapp_number, whatsapp_custom_message, 
            warranty_text, delivery_text, payment_methods_text, device_condition_mode, 
            installment_rate_12x, installment_rate_24x, theme 
        } = body

        // Check if row already exists for this company
        const { data: existing } = await db
            .from('catalog_settings')
            .select('id')
            .eq('company_id', companyId)
            .maybeSingle()

        const payload: any = {
            company_id: companyId,
            slug: slug || 'minha-loja',
            catalog_title: catalog_title || 'Nosso Catálogo Oficial',
            announcement_bar: announcement_bar || null,
            whatsapp_number: whatsapp_number || null,
            whatsapp_custom_message: whatsapp_custom_message || null,
            warranty_text: warranty_text || null,
            delivery_text: delivery_text || null,
            payment_methods_text: payment_methods_text || null,
            device_condition_mode: device_condition_mode || 'todos',
            installment_rate_12x: installment_rate_12x !== undefined ? Number(installment_rate_12x) : 10.0,
            installment_rate_24x: installment_rate_24x !== undefined ? Number(installment_rate_24x) : 18.0,
            theme: theme || null,
            updated_at: new Date().toISOString()
        }

        let savedSettings = null
        if (existing?.id) {
            const { data, error } = await db
                .from('catalog_settings')
                .update(payload)
                .eq('id', existing.id)
                .select()
                .single()

            if (error) {
                console.error('Error updating catalog_settings:', error)
                return NextResponse.json({ error: error.message }, { status: 500 })
            }
            savedSettings = data
        } else {
            payload.is_active = true
            const { data, error } = await db
                .from('catalog_settings')
                .insert([payload])
                .select()
                .single()

            if (error) {
                console.error('Error inserting catalog_settings:', error)
                return NextResponse.json({ error: error.message }, { status: 500 })
            }
            savedSettings = data
        }

        return NextResponse.json({ success: true, settings: savedSettings })
    } catch (err: any) {
        console.error('Exception in saving catalog settings:', err)
        return NextResponse.json({ error: 'Erro ao salvar configurações: ' + err.message }, { status: 500 })
    }
}
