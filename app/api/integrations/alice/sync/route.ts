import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'

export async function POST(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId } = ctx

    try {
        // 1. Buscar configurações da Alice na tabela companies
        const { data: company, error: companyError } = await db
            .from('companies')
            .select('alice_active, alice_token, alice_sync_url')
            .eq('id', companyId)
            .single()

        if (companyError || !company) {
            return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })
        }

        if (!company.alice_active) {
            return NextResponse.json({ error: 'A integração com a Alice AI não está ativa.' }, { status: 400 })
        }

        if (!company.alice_token || !company.alice_sync_url) {
            return NextResponse.json({ error: 'Configurações da Alice AI incompletas (chave de acesso ou URL de sincronização ausentes).' }, { status: 400 })
        }

        // Validar se está utilizando a URL fictícia de exemplo do guia
        if (company.alice_sync_url.includes('sua-api-alice.com.br') || company.alice_sync_url.includes('sua-api-alice.com') || company.alice_sync_url.includes('api.alice.com')) {
            return NextResponse.json({ 
                error: 'Você está utilizando a URL de exemplo do guia. Insira a URL real de integração da Alice AI para sincronizar seu catálogo.' 
            }, { status: 400 })
        }

        // 2. Buscar serviços ativos da empresa
        const { data: services, error: servicesError } = await db
            .from('service_types')
            .select('*')
            .eq('company_id', companyId)
            .eq('is_active', true)

        if (servicesError) {
            return NextResponse.json({ error: 'Erro ao carregar serviços: ' + servicesError.message }, { status: 500 })
        }

        if (!services || services.length === 0) {
            return NextResponse.json({ error: 'Nenhum serviço ativo cadastrado no sistema para sincronizar.' }, { status: 400 })
        }

        // 3. Formatar o payload para a Alice AI
        // Mapeamos o estoque (stock) como prazo de entrega padrão em dias (ex: 1 dia útil por padrão)
        // Se houver algum campo customizado como estimated_days no JSONB custom_fields, tentamos utilizá-lo.
        const items = services.map(s => {
            let estimatedDays = 1 // Prazo estimado padrão em dias
            if (s.custom_fields && typeof s.custom_fields === 'object') {
                const custom = s.custom_fields as Record<string, any>
                if (custom.estimated_time_days) {
                    estimatedDays = parseInt(custom.estimated_time_days) || 1
                } else if (custom.repair_days) {
                    estimatedDays = parseInt(custom.repair_days) || 1
                }
            }

            return {
                name: s.name,
                description: s.description || `Serviço especializado de ${s.name}`,
                price: parseFloat(s.base_price) || 0.0,
                stock: estimatedDays, // Mapeado no nicho de assistência como o Prazo Estimado de Reparo (em dias úteis)
                category: 'Serviços',
                sku: `SER-${s.id.substring(0, 8).toUpperCase()}`
            }
        })

        const payload = { items }

        // 4. Disparar POST para a Alice AI
        const aliceResponse = await fetch(company.alice_sync_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-nexus-key': company.alice_token
            },
            body: JSON.stringify(payload),
        })

        if (!aliceResponse.ok) {
            const errorText = await aliceResponse.text()
            return NextResponse.json({ 
                error: `A Alice AI recusou a sincronização (Código ${aliceResponse.status}): ${errorText || 'Sem resposta.'}` 
            }, { status: 400 })
        }

        return NextResponse.json({ 
            success: true, 
            message: `Catálogo de ${services.length} serviços sincronizado com sucesso com a Alice AI!` 
        })

    } catch (error: any) {
        let msg = error.message
        if (msg === 'fetch failed') {
            msg = 'Não foi possível conectar ao servidor da Alice AI. Verifique se o endereço (URL) de sincronização configurado é válido e está acessível.'
        }
        return NextResponse.json({ error: 'Erro de sincronização: ' + msg }, { status: 500 })
    }
}
