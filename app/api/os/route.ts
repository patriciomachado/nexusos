import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
    try {
        // 1. Validar autenticação Bearer Token
        const authHeader = req.headers.get('authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
        }
        const token = authHeader.substring(7).trim()

        if (!token) {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
        }

        // 2. Buscar empresa ativa que possua esta chave
        const db = createAdminClient()
        const { data: company, error: companyError } = await db
            .from('companies')
            .select('id, name')
            .eq('alice_active', true)
            .eq('alice_token', token)
            .maybeSingle()

        if (companyError || !company) {
            return NextResponse.json({ error: 'Não autorizado ou integração inativa.' }, { status: 401 })
        }

        // 3. Coletar o telefone enviado pela Alice
        const { searchParams } = new URL(req.url)
        const phone = searchParams.get('phone')
        if (!phone) {
            return NextResponse.json({ error: 'Parâmetro phone é obrigatório.' }, { status: 400 })
        }

        const digits = phone.replace(/\D/g, '')
        if (digits.length < 8) {
            return NextResponse.json({ error: 'Número de telefone inválido.' }, { status: 400 })
        }

        // Criar variações do telefone para busca flexível (com e sem DDI 55)
        const phoneFilters: string[] = [digits]
        if (digits.startsWith('55') && digits.length > 10) {
            phoneFilters.push(digits.substring(2)) // Ex: 5548999999999 -> 48999999999
        } else if (digits.length === 10 || digits.length === 11) {
            phoneFilters.push('55' + digits) // Ex: 48999999999 -> 5548999999999
        }

        // 4. Buscar clientes ativos desta empresa
        const { data: customers, error: customersError } = await db
            .from('customers')
            .select('id, name, phone')
            .eq('company_id', company.id)
            .eq('is_active', true)

        if (customersError) {
            return NextResponse.json({ error: customersError.message }, { status: 500 })
        }

        // Filtrar clientes cujos números batem de forma flexível
        const matchingCustomers = customers.filter(c => {
            if (!c.phone) return false
            const custDigits = c.phone.replace(/\D/g, '')
            if (custDigits.length < 8) return false
            
            return phoneFilters.some(f => custDigits.includes(f) || f.includes(custDigits))
        })

        if (matchingCustomers.length === 0) {
            return NextResponse.json([])
        }

        const customerIds = matchingCustomers.map(c => c.id)

        // 5. Buscar ordens de serviço ativas para estes clientes
        const { data: orders, error: ordersError } = await db
            .from('service_orders')
            .select('*, technicians(name)')
            .eq('company_id', company.id)
            .in('customer_id', customerIds)
            .order('created_at', { ascending: false })

        if (ordersError) {
            return NextResponse.json({ error: ordersError.message }, { status: 500 })
        }

        // Mapeador de status do Nexus para português amigável
        const formatStatus = (status: string) => {
            const map: Record<string, string> = {
                'aberta': 'Aberta',
                'agendada': 'Agendada',
                'em_andamento': 'Em Andamento',
                'aguardando_pecas': 'Aguardando Peças',
                'concluida': 'Concluída',
                'faturada': 'Concluída / Faturada',
                'cancelada': 'Cancelada'
            }
            return map[status.toLowerCase()] || status
        }

        // Formatar ordens para o padrão oficial da Alice AI
        const responseData = orders.map(o => {
            const estPrice = parseFloat(o.estimated_cost) || 0.0
            const laborCost = parseFloat(o.labor_cost) || 0.0
            const partsCost = parseFloat(o.parts_cost) || 0.0
            const totalActual = laborCost + partsCost
            
            return {
                os_number: o.order_number || '',
                device: o.equipment_description || o.title || 'Aparelho',
                serial_number: o.equipment_serial || '',
                reported_symptom: o.description || o.problem_description || 'Problema sob análise.',
                status: formatStatus(o.status),
                status_details: o.solution_applied || o.internal_notes || 'Aparelho sob diagnóstico da equipe de assistência técnica.',
                estimated_price: estPrice > 0 ? estPrice : (totalActual > 0 ? totalActual : 0.0),
                diagnostic_fee: laborCost > 0 ? laborCost : 0.0,
                created_at: o.created_at,
                technician: o.technicians?.name || 'Renato Silva'
            }
        })

        return NextResponse.json(responseData)

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
