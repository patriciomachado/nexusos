import { z } from 'zod'
import { defineRead, defineWrite, ToolError, type AnyTool, type ToolContext } from './types'
import {
    OS_STATUS_LABELS, OS_PRIORITY_LABELS, brl, cleanSearch, findCustomer, findOrder, findTechnician,
    formatDate, formatDateTime, isUuid, localToIso, logOrderHistory, nextOrderNumber, todayInStore,
} from './helpers'
import { ADMIN_ROLES, appUrl } from '../config'
import { collectAlerts } from '@/lib/tasks/alerts'
import { addDays } from '@/lib/tasks/dates'

const MANAGERS = [...ADMIN_ROLES, 'manager']

const OS_STATUSES = ['aberta', 'agendada', 'em_andamento', 'aguardando_pecas', 'concluida', 'faturada', 'cancelada'] as const
/** Billing goes through the payment screen (cash register); Alice never sets "faturada". */
const SETTABLE_STATUSES = ['aberta', 'agendada', 'em_andamento', 'aguardando_pecas', 'concluida', 'cancelada'] as const
const PRIORITIES = ['baixa', 'normal', 'alta', 'urgente'] as const

type Row = Record<string, unknown>
const one = <T>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null)

function orderSummary(os: Row) {
    const customer = one(os.customers as Row | Row[] | null)
    const tech = one(os.technicians as Row | Row[] | null)
    return {
        numero: os.order_number,
        titulo: os.title,
        status: OS_STATUS_LABELS[String(os.status)] ?? os.status,
        prioridade: OS_PRIORITY_LABELS[String(os.priority)] ?? os.priority,
        cliente: customer?.name ?? null,
        telefone_cliente: customer?.phone ?? null,
        tecnico: tech?.name ?? null,
        equipamento: os.equipment_description ?? null,
        valor_estimado: os.estimated_cost != null ? brl(os.estimated_cost as number) : null,
        valor_final: Number(os.final_cost) > 0 ? brl(os.final_cost as number) : null,
        aberta_em: formatDate(os.created_at as string),
        agendada_para: formatDateTime(os.scheduled_date as string | null),
        atualizada_em: formatDate(os.updated_at as string),
    }
}

// ─── Clientes ────────────────────────────────────────────────────────────────

const buscarClientes = defineRead({
    name: 'buscar_clientes',
    label: 'Buscando clientes',
    description: 'Busca clientes da loja por nome, telefone, e-mail ou CPF/CNPJ. Use antes de qualquer ação sobre um cliente para obter o id dele.',
    schema: z.object({
        busca: z.string().min(2).describe('Nome, parte do nome, telefone, e-mail ou documento'),
    }),
    async run(ctx, { busca }) {
        const term = cleanSearch(busca)
        const digits = busca.replace(/\D/g, '')
        const filters = [`name.ilike.%${term}%`, `email.ilike.%${term}%`]
        if (digits.length >= 4) filters.push(`phone.ilike.%${digits.slice(-4)}%`, `cpf_cnpj.ilike.%${digits}%`)
        const { data, error } = await ctx.db
            .from('customers')
            .select('id, name, phone, email, city, cpf_cnpj')
            .eq('company_id', ctx.companyId)
            .eq('is_active', true)
            .or(filters.join(','))
            .order('name')
            .limit(25)
        if (error) throw new ToolError('Não consegui buscar clientes agora.')
        let rows = data ?? []
        // The phone filter above matches only the last 4 digits; keep exact matches.
        if (digits.length >= 8) {
            const exact = rows.filter(r => (r.phone ?? '').replace(/\D/g, '').endsWith(digits.slice(-8)))
            if (exact.length) rows = exact
        }
        return { total: rows.length, clientes: rows.slice(0, 10).map(c => ({ id: c.id, nome: c.name, telefone: c.phone, email: c.email, cidade: c.city })) }
    },
})

const verCliente = defineRead({
    name: 'ver_cliente',
    label: 'Abrindo ficha do cliente',
    description: 'Mostra a ficha de um cliente: contato, observações e as últimas ordens de serviço.',
    schema: z.object({ cliente_id: z.string().describe('id retornado por buscar_clientes') }),
    async run(ctx, { cliente_id }) {
        if (!isUuid(cliente_id)) throw new ToolError('Use o id retornado por buscar_clientes.')
        const { data: c } = await ctx.db
            .from('customers')
            .select('id, name, phone, email, cpf_cnpj, address, city, state, birth_date, notes, created_at')
            .eq('company_id', ctx.companyId)
            .eq('id', cliente_id)
            .maybeSingle()
        if (!c) throw new ToolError('Cliente não encontrado nesta loja.')
        const { data: orders } = await ctx.db
            .from('service_orders')
            .select('order_number, title, status, priority, equipment_description, estimated_cost, final_cost, created_at, updated_at, scheduled_date')
            .eq('company_id', ctx.companyId)
            .eq('customer_id', cliente_id)
            .order('created_at', { ascending: false })
            .limit(10)
        const billed = (orders ?? []).filter(o => o.status === 'faturada').reduce((s, o) => s + Number(o.final_cost || 0), 0)
        return {
            id: c.id,
            nome: c.name,
            telefone: c.phone,
            email: c.email,
            documento: c.cpf_cnpj,
            endereco: [c.address, c.city, c.state].filter(Boolean).join(', ') || null,
            aniversario: formatDate(c.birth_date),
            observacoes: c.notes,
            cliente_desde: formatDate(c.created_at),
            total_faturado_ultimas_os: brl(billed),
            ultimas_ordens: (orders ?? []).map(orderSummary),
        }
    },
})

const cadastrarCliente = defineWrite({
    name: 'cadastrar_cliente',
    label: 'Preparando cadastro de cliente',
    description: 'Cadastra um novo cliente. Antes, use buscar_clientes para evitar duplicidade.',
    schema: z.object({
        nome: z.string().min(2).max(120),
        telefone: z.string().max(30).optional(),
        email: z.string().email().optional(),
        documento: z.string().max(20).optional().describe('CPF ou CNPJ'),
        cidade: z.string().max(80).optional(),
        observacoes: z.string().max(1000).optional(),
    }),
    async preview(_ctx, i) {
        return {
            title: 'Cadastrar cliente',
            lines: [i.nome, i.telefone && `Telefone: ${i.telefone}`, i.email && `E-mail: ${i.email}`, i.documento && `Documento: ${i.documento}`, i.cidade && `Cidade: ${i.cidade}`, i.observacoes && `Obs.: ${i.observacoes}`].filter(Boolean) as string[],
        }
    },
    async execute(ctx, i) {
        const { data, error } = await ctx.db
            .from('customers')
            .insert({
                company_id: ctx.companyId,
                name: i.nome.trim(),
                phone: i.telefone ?? null,
                email: i.email ?? null,
                cpf_cnpj: i.documento ?? null,
                city: i.cidade ?? null,
                notes: i.observacoes ?? null,
                is_active: true,
            })
            .select('id, name')
            .single()
        if (error || !data) throw new ToolError('Não foi possível cadastrar o cliente.')
        return { message: `Cliente ${data.name} cadastrado.`, href: `/customers/${data.id}`, data: { cliente_id: data.id } }
    },
})

const atualizarCliente = defineWrite({
    name: 'atualizar_cliente',
    label: 'Preparando atualização do cliente',
    description: 'Atualiza dados de contato ou observações de um cliente existente.',
    roles: MANAGERS,
    schema: z.object({
        cliente_id: z.string(),
        nome: z.string().min(2).max(120).optional(),
        telefone: z.string().max(30).optional(),
        email: z.string().email().optional(),
        documento: z.string().max(20).optional(),
        cidade: z.string().max(80).optional(),
        observacoes: z.string().max(1000).optional(),
    }),
    async preview(ctx, i) {
        const c = await findCustomer(ctx, i.cliente_id)
        const changes = [
            i.nome && `Nome: ${i.nome}`, i.telefone && `Telefone: ${i.telefone}`, i.email && `E-mail: ${i.email}`,
            i.documento && `Documento: ${i.documento}`, i.cidade && `Cidade: ${i.cidade}`, i.observacoes && `Observações: ${i.observacoes}`,
        ].filter(Boolean) as string[]
        if (!changes.length) throw new ToolError('Nenhuma alteração informada.')
        return { title: `Atualizar cliente ${c.name}`, lines: changes }
    },
    async execute(ctx, i) {
        const c = await findCustomer(ctx, i.cliente_id)
        const patch: Row = { updated_at: new Date().toISOString() }
        if (i.nome) patch.name = i.nome
        if (i.telefone) patch.phone = i.telefone
        if (i.email) patch.email = i.email
        if (i.documento) patch.cpf_cnpj = i.documento
        if (i.cidade) patch.city = i.cidade
        if (i.observacoes) patch.notes = i.observacoes
        const { error } = await ctx.db.from('customers').update(patch).eq('id', c.id).eq('company_id', ctx.companyId)
        if (error) throw new ToolError('Não foi possível atualizar o cliente.')
        return { message: `Cliente ${i.nome ?? c.name} atualizado.`, href: `/customers/${c.id}` }
    },
})

// ─── Ordens de serviço ───────────────────────────────────────────────────────

const buscarOrdens = defineRead({
    name: 'buscar_ordens',
    label: 'Buscando ordens de serviço',
    description: 'Lista ordens de serviço com filtros opcionais (texto, status, cliente, técnico). Sem filtros, traz as mais recentes em aberto.',
    schema: z.object({
        busca: z.string().optional().describe('Número da OS, título ou equipamento'),
        status: z.array(z.enum(OS_STATUSES)).optional(),
        cliente_id: z.string().optional(),
        tecnico_id: z.string().optional(),
        limite: z.number().int().min(1).max(30).optional(),
    }),
    async run(ctx, i) {
        let q = ctx.db
            .from('service_orders')
            .select('order_number, title, status, priority, equipment_description, estimated_cost, final_cost, created_at, updated_at, scheduled_date, customers(name, phone), technicians(name)')
            .eq('company_id', ctx.companyId)
            .order('created_at', { ascending: false })
            .limit(i.limite ?? 15)
        if (i.status?.length) q = q.in('status', i.status)
        else if (!i.busca && !i.cliente_id) q = q.not('status', 'in', '(faturada,cancelada)')
        if (i.cliente_id && isUuid(i.cliente_id)) q = q.eq('customer_id', i.cliente_id)
        if (i.tecnico_id && isUuid(i.tecnico_id)) q = q.eq('technician_id', i.tecnico_id)
        if (i.busca) {
            const t = cleanSearch(i.busca)
            const digits = i.busca.replace(/\D/g, '')
            const f = [`title.ilike.%${t}%`, `equipment_description.ilike.%${t}%`, `order_number.ilike.%${t}%`]
            if (digits) f.push(`order_number.ilike.%${digits}%`)
            q = q.or(f.join(','))
        }
        const { data, error } = await q
        if (error) throw new ToolError('Não consegui buscar as ordens agora.')
        return { total: data?.length ?? 0, ordens: (data ?? []).map(o => orderSummary(o as Row)) }
    },
})

const verOrdem = defineRead({
    name: 'ver_ordem',
    label: 'Abrindo a OS',
    description: 'Detalhes completos de uma ordem de serviço: cliente, equipamento, defeito, valores, peças, pagamentos e histórico.',
    schema: z.object({ ordem: z.string().describe('Número da OS, ex.: OS-00014 ou 14') }),
    async run(ctx, { ordem }) {
        const base = await findOrder(ctx, ordem, 'id')
        const { data: os } = await ctx.db
            .from('service_orders')
            .select('*, customers(name, phone), technicians(name), service_order_items(item_name, quantity, unit_price, total_price), payments(amount, payment_method, payment_status, payment_date), service_order_history(field_name, old_value, new_value, change_reason, changed_by_name, created_at)')
            .eq('company_id', ctx.companyId)
            .eq('id', base.id)
            .single()
        if (!os) throw new ToolError('Não encontrei essa OS.')
        const history = ((os.service_order_history as Row[]) ?? [])
            .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
            .slice(0, 8)
        return {
            ...orderSummary(os),
            defeito_relatado: os.problem_description ?? os.description ?? null,
            solucao: os.solution_applied ?? null,
            numero_de_serie: os.equipment_serial ?? null,
            condicao_do_aparelho: os.device_condition ?? null,
            liga: os.turns_on,
            mao_de_obra: brl(os.labor_cost),
            pecas: brl(os.parts_cost),
            garantia_meses: os.warranty_months,
            observacoes_internas: os.internal_notes ?? null,
            itens: ((os.service_order_items as Row[]) ?? []).map(it => ({ item: it.item_name, qtd: it.quantity, total: brl(it.total_price as number) })),
            pagamentos: ((os.payments as Row[]) ?? []).map(p => ({ valor: brl(p.amount as number), forma: p.payment_method, status: p.payment_status, data: formatDate(p.payment_date as string) })),
            historico: history.map(h => ({ quando: formatDateTime(h.created_at as string), campo: h.field_name, de: h.old_value, para: h.new_value, motivo: h.change_reason, por: h.changed_by_name })),
            link: `/service-orders/${os.id}`,
            link_acompanhamento_cliente: os.tracking_token ? `${appUrl()}/tracking/${os.tracking_token}` : null,
        }
    },
})

const criarOrdem = defineWrite({
    name: 'criar_ordem',
    label: 'Preparando nova OS',
    description: 'Abre uma nova ordem de serviço para um cliente já cadastrado (use buscar_clientes para obter o id; se não existir, cadastre antes).',
    schema: z.object({
        cliente_id: z.string(),
        titulo: z.string().min(3).max(150).describe('Resumo do serviço, ex.: "Troca de tela iPhone 12"'),
        equipamento: z.string().max(150).optional().describe('Marca e modelo do aparelho'),
        defeito: z.string().max(2000).optional().describe('Defeito relatado pelo cliente'),
        valor_estimado: z.number().min(0).max(1_000_000).optional(),
        prioridade: z.enum(PRIORITIES).optional(),
        tecnico_id: z.string().optional(),
        numero_de_serie: z.string().max(80).optional().describe('IMEI ou número de série'),
        observacoes_internas: z.string().max(2000).optional(),
    }),
    async preview(ctx, i) {
        const c = await findCustomer(ctx, i.cliente_id)
        const tech = i.tecnico_id ? await findTechnician(ctx, i.tecnico_id) : null
        return {
            title: 'Abrir ordem de serviço',
            lines: [
                `Cliente: ${c.name}`,
                `Serviço: ${i.titulo}`,
                i.equipamento && `Aparelho: ${i.equipamento}`,
                i.defeito && `Defeito: ${i.defeito}`,
                i.valor_estimado != null && `Valor estimado: ${brl(i.valor_estimado)}`,
                i.prioridade && `Prioridade: ${OS_PRIORITY_LABELS[i.prioridade]}`,
                tech && `Técnico: ${tech.name}`,
                i.numero_de_serie && `Série/IMEI: ${i.numero_de_serie}`,
            ].filter(Boolean) as string[],
        }
    },
    async execute(ctx, i) {
        const c = await findCustomer(ctx, i.cliente_id)
        const tech = i.tecnico_id ? await findTechnician(ctx, i.tecnico_id) : null
        const orderNumber = await nextOrderNumber(ctx)
        const { data, error } = await ctx.db
            .from('service_orders')
            .insert({
                company_id: ctx.companyId,
                order_number: orderNumber,
                customer_id: c.id,
                technician_id: tech?.id ?? null,
                title: i.titulo,
                equipment_description: i.equipamento ?? null,
                equipment_serial: i.numero_de_serie ?? null,
                problem_description: i.defeito ?? null,
                estimated_cost: i.valor_estimado ?? 0,
                priority: i.prioridade ?? 'normal',
                status: 'aberta',
                internal_notes: i.observacoes_internas ?? null,
                created_by: ctx.user?.id ?? null,
            })
            .select('id, order_number')
            .single()
        if (error || !data) throw new ToolError('Não foi possível abrir a OS.')
        await logOrderHistory(ctx, data.id, 'status', null, 'aberta', 'OS criada pela Alice')
        if (tech?.user_id) {
            await ctx.db.from('notifications').insert({
                company_id: ctx.companyId, user_id: tech.user_id, type: 'push', status: 'pending',
                title: 'Nova OS atribuída', message: `A OS #${data.order_number} - ${i.titulo} foi atribuída a você`,
                related_entity_type: 'service_order', related_entity_id: data.id,
            })
        }
        return { message: `OS ${data.order_number} aberta para ${c.name}.`, href: `/service-orders/${data.id}`, data: { numero: data.order_number } }
    },
})

const atualizarStatus = defineWrite({
    name: 'atualizar_status_ordem',
    label: 'Preparando mudança de status',
    description: 'Muda o status de uma OS. Para faturar/receber pagamento, oriente o usuário a usar a tela da OS (o pagamento entra no caixa). Cancelar exige perfil de gerente ou administrador.',
    schema: z.object({
        ordem: z.string(),
        status: z.enum(SETTABLE_STATUSES),
        motivo: z.string().max(300).optional(),
    }),
    async preview(ctx, i) {
        const os = await findOrder(ctx, i.ordem)
        if (i.status === 'cancelada' && !MANAGERS.includes(ctx.user?.role ?? '')) throw new ToolError('Somente gerente ou administrador pode cancelar uma OS.')
        if (os.status === 'faturada') throw new ToolError(`A OS ${os.order_number} já foi faturada; o status não pode ser alterado pela Alice.`)
        if (os.status === i.status) throw new ToolError(`A OS ${os.order_number} já está como ${OS_STATUS_LABELS[i.status]}.`)
        return {
            title: `Status da ${os.order_number}`,
            lines: [os.title, `${OS_STATUS_LABELS[os.status] ?? os.status} → ${OS_STATUS_LABELS[i.status]}`, i.motivo && `Motivo: ${i.motivo}`].filter(Boolean) as string[],
        }
    },
    async execute(ctx, i) {
        const os = await findOrder(ctx, i.ordem)
        if (i.status === 'cancelada' && !MANAGERS.includes(ctx.user?.role ?? '')) throw new ToolError('Somente gerente ou administrador pode cancelar uma OS.')
        if (os.status === 'faturada') throw new ToolError('OS já faturada.')
        const now = new Date().toISOString()
        const patch: Row = { status: i.status, updated_at: now }
        if (i.status === 'em_andamento') patch.started_at = now
        if (i.status === 'concluida') patch.completed_at = now
        const { error } = await ctx.db.from('service_orders').update(patch).eq('id', os.id).eq('company_id', ctx.companyId)
        if (error) throw new ToolError('Não foi possível mudar o status.')
        await logOrderHistory(ctx, os.id, 'status', os.status, i.status, i.motivo || 'Alterado pela Alice')
        return { message: `${os.order_number} agora está ${OS_STATUS_LABELS[i.status]}.`, href: `/service-orders/${os.id}` }
    },
})

const anotarOrdem = defineWrite({
    name: 'adicionar_nota_ordem',
    label: 'Preparando anotação',
    description: 'Acrescenta uma anotação interna (não visível ao cliente) em uma OS.',
    schema: z.object({ ordem: z.string(), nota: z.string().min(2).max(1000) }),
    async preview(ctx, i) {
        const os = await findOrder(ctx, i.ordem)
        return { title: `Anotar na ${os.order_number}`, lines: [os.title, `“${i.nota}”`] }
    },
    async execute(ctx, i) {
        const os = await findOrder(ctx, i.ordem)
        const stamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
        const author = ctx.user?.name ?? 'Alice'
        const notes = [String(os.internal_notes ?? '').trim(), `[${stamp} · ${author}] ${i.nota}`].filter(Boolean).join('\n')
        const { error } = await ctx.db.from('service_orders').update({ internal_notes: notes, updated_at: new Date().toISOString() }).eq('id', os.id).eq('company_id', ctx.companyId)
        if (error) throw new ToolError('Não foi possível salvar a anotação.')
        await logOrderHistory(ctx, os.id, 'internal_notes', null, i.nota, 'Anotação pela Alice')
        return { message: `Anotação salva na ${os.order_number}.`, href: `/service-orders/${os.id}` }
    },
})

const atribuirTecnico = defineWrite({
    name: 'atribuir_tecnico',
    label: 'Preparando atribuição',
    description: 'Atribui (ou troca) o técnico responsável por uma OS. Use listar_tecnicos para obter o id.',
    roles: MANAGERS,
    schema: z.object({ ordem: z.string(), tecnico_id: z.string() }),
    async preview(ctx, i) {
        const os = await findOrder(ctx, i.ordem)
        const tech = await findTechnician(ctx, i.tecnico_id)
        return { title: `Técnico da ${os.order_number}`, lines: [os.title, `Responsável: ${tech.name}`] }
    },
    async execute(ctx, i) {
        const os = await findOrder(ctx, i.ordem)
        const tech = await findTechnician(ctx, i.tecnico_id)
        const { error } = await ctx.db.from('service_orders').update({ technician_id: tech.id, updated_at: new Date().toISOString() }).eq('id', os.id).eq('company_id', ctx.companyId)
        if (error) throw new ToolError('Não foi possível atribuir o técnico.')
        await logOrderHistory(ctx, os.id, 'technician_id', String(os.technician_id ?? ''), tech.id, `Técnico: ${tech.name} (via Alice)`)
        if (tech.user_id && tech.id !== os.technician_id) {
            await ctx.db.from('notifications').insert({
                company_id: ctx.companyId, user_id: tech.user_id, type: 'push', status: 'pending',
                title: 'Nova OS atribuída', message: `A OS #${os.order_number} - ${os.title} foi atribuída a você`,
                related_entity_type: 'service_order', related_entity_id: os.id,
            })
        }
        return { message: `${tech.name} agora é o responsável pela ${os.order_number}.`, href: `/service-orders/${os.id}` }
    },
})

// ─── Agenda, equipe e catálogo ───────────────────────────────────────────────

const agenda = defineRead({
    name: 'ver_agenda',
    label: 'Consultando a agenda',
    description: 'Agendamentos e OS agendadas em um período (padrão: hoje).',
    schema: z.object({
        data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Dia inicial AAAA-MM-DD (padrão hoje)'),
        dias: z.number().int().min(1).max(14).optional().describe('Quantos dias a partir da data (padrão 1)'),
    }),
    async run(ctx, i) {
        const start = i.data ?? todayInStore()
        const end = addDays(start, i.dias ?? 1)
        const from = localToIso(start, '00:00'), to = localToIso(end, '00:00')
        const [appts, orders] = await Promise.all([
            ctx.db.from('appointments')
                .select('title, scheduled_date, status, notes, customers(name, phone), technicians(name), service_orders(order_number)')
                .eq('company_id', ctx.companyId).gte('scheduled_date', from).lt('scheduled_date', to).order('scheduled_date'),
            ctx.db.from('service_orders')
                .select('order_number, title, status, scheduled_date, customers(name), technicians(name)')
                .eq('company_id', ctx.companyId).gte('scheduled_date', from).lt('scheduled_date', to).not('status', 'in', '(cancelada)').order('scheduled_date'),
        ])
        return {
            periodo: `${formatDate(start)} a ${formatDate(addDays(end, -1))}`,
            agendamentos: (appts.data ?? []).map(a => ({
                quando: formatDateTime(a.scheduled_date), titulo: a.title, status: a.status,
                cliente: one(a.customers as Row | Row[])?.name ?? null, tecnico: one(a.technicians as Row | Row[])?.name ?? null,
                os: one(a.service_orders as Row | Row[])?.order_number ?? null, obs: a.notes,
            })),
            ordens_agendadas: (orders.data ?? []).map(o => ({
                quando: formatDateTime(o.scheduled_date), os: o.order_number, titulo: o.title, status: OS_STATUS_LABELS[o.status] ?? o.status,
                cliente: one(o.customers as Row | Row[])?.name ?? null, tecnico: one(o.technicians as Row | Row[])?.name ?? null,
            })),
        }
    },
})

const agendar = defineWrite({
    name: 'agendar_atendimento',
    label: 'Preparando agendamento',
    description: 'Cria um agendamento na agenda da loja para um cliente e um técnico, opcionalmente ligado a uma OS.',
    schema: z.object({
        cliente_id: z.string(),
        tecnico_id: z.string(),
        data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('AAAA-MM-DD'),
        hora: z.string().regex(/^\d{2}:\d{2}$/).describe('HH:MM, horário da loja'),
        titulo: z.string().max(150).optional(),
        ordem: z.string().optional().describe('Número da OS relacionada'),
        observacoes: z.string().max(1000).optional(),
    }),
    async preview(ctx, i) {
        const c = await findCustomer(ctx, i.cliente_id)
        const tech = await findTechnician(ctx, i.tecnico_id)
        const os = i.ordem ? await findOrder(ctx, i.ordem) : null
        return {
            title: 'Agendar atendimento',
            lines: [`${formatDate(i.data)} às ${i.hora}`, `Cliente: ${c.name}`, `Técnico: ${tech.name}`, i.titulo && `Assunto: ${i.titulo}`, os && `OS: ${os.order_number}`, i.observacoes && `Obs.: ${i.observacoes}`].filter(Boolean) as string[],
        }
    },
    async execute(ctx, i) {
        const c = await findCustomer(ctx, i.cliente_id)
        const tech = await findTechnician(ctx, i.tecnico_id)
        const os = i.ordem ? await findOrder(ctx, i.ordem) : null
        const when = localToIso(i.data, i.hora)
        if (new Date(when).getTime() < Date.now() - 3_600_000) throw new ToolError('Esse horário já passou.')
        const { data, error } = await ctx.db.from('appointments').insert({
            company_id: ctx.companyId,
            customer_id: c.id,
            technician_id: tech.id,
            service_order_id: os?.id ?? null,
            title: i.titulo ?? (os ? `${os.order_number} · ${os.title}` : `Atendimento ${c.name}`),
            scheduled_date: when,
            status: 'scheduled',
            notes: i.observacoes ?? null,
        }).select('id').single()
        if (error || !data) throw new ToolError('Não foi possível criar o agendamento.')
        return { message: `Agendado: ${c.name} em ${formatDate(i.data)} às ${i.hora} com ${tech.name}.`, href: '/appointments' }
    },
})

const listarTecnicos = defineRead({
    name: 'listar_tecnicos',
    label: 'Consultando a equipe técnica',
    description: 'Técnicos ativos com a quantidade de OS em aberto de cada um.',
    schema: z.object({}),
    async run(ctx) {
        const [techs, open] = await Promise.all([
            ctx.db.from('technicians').select('id, name, phone, specialties').eq('company_id', ctx.companyId).eq('is_active', true).order('name'),
            ctx.db.from('service_orders').select('technician_id').eq('company_id', ctx.companyId).not('status', 'in', '(concluida,faturada,cancelada)'),
        ])
        const load = new Map<string, number>()
        for (const o of open.data ?? []) if (o.technician_id) load.set(o.technician_id, (load.get(o.technician_id) ?? 0) + 1)
        return { tecnicos: (techs.data ?? []).map(t => ({ id: t.id, nome: t.name, os_em_aberto: load.get(t.id) ?? 0, especialidades: t.specialties })) }
    },
})

const consultarEstoque = defineRead({
    name: 'consultar_estoque',
    label: 'Consultando o estoque',
    description: 'Consulta produtos e peças do estoque (quantidade e preço de venda). Pode listar só os itens abaixo do mínimo.',
    schema: z.object({
        busca: z.string().optional(),
        apenas_baixo: z.boolean().optional().describe('Somente itens no mínimo ou abaixo'),
    }),
    async run(ctx, i) {
        let q = ctx.db.from('inventory_items')
            .select('name, sku, category, quantity_in_stock, minimum_quantity, selling_price, unit')
            .eq('company_id', ctx.companyId).eq('is_active', true).order('name').limit(i.apenas_baixo ? 200 : 20)
        if (i.busca) {
            const t = cleanSearch(i.busca)
            q = q.or(`name.ilike.%${t}%,sku.ilike.%${t}%,category.ilike.%${t}%`)
        }
        const { data, error } = await q
        if (error) throw new ToolError('Não consegui consultar o estoque.')
        let rows = data ?? []
        if (i.apenas_baixo) rows = rows.filter(r => Number(r.quantity_in_stock) <= Number(r.minimum_quantity ?? 0)).slice(0, 30)
        return { itens: rows.map(r => ({ nome: r.name, sku: r.sku, categoria: r.category, estoque: Number(r.quantity_in_stock), minimo: Number(r.minimum_quantity ?? 0), preco: brl(r.selling_price), unidade: r.unit })) }
    },
})

const consultarAparelhos = defineRead({
    name: 'consultar_aparelhos',
    label: 'Consultando aparelhos à venda',
    description: 'Aparelhos (celulares novos e seminovos) disponíveis para venda, com preço à vista e parcelado.',
    schema: z.object({ busca: z.string().optional().describe('Marca ou modelo') }),
    async run(ctx, i) {
        let q = ctx.db.from('devices')
            .select('brand, model, storage, color, condition, battery_health, cash_price, installment_price, status')
            .eq('company_id', ctx.companyId).eq('status', 'available').order('created_at', { ascending: false }).limit(20)
        if (i.busca) {
            const t = cleanSearch(i.busca)
            q = q.or(`brand.ilike.%${t}%,model.ilike.%${t}%`)
        }
        const { data, error } = await q
        if (error) throw new ToolError('Não consegui consultar os aparelhos.')
        return { aparelhos: (data ?? []).map(d => ({ aparelho: [d.brand, d.model, d.storage, d.color].filter(Boolean).join(' '), condicao: d.condition, bateria: d.battery_health ? `${d.battery_health}%` : null, a_vista: brl(d.cash_price), parcelado: d.installment_price ? brl(d.installment_price) : null })) }
    },
})

const listarServicos = defineRead({
    name: 'listar_servicos',
    label: 'Consultando serviços',
    description: 'Tabela de serviços cadastrados com preço base.',
    schema: z.object({}),
    async run(ctx) {
        const { data } = await ctx.db.from('service_types').select('name, description, base_price').eq('company_id', ctx.companyId).eq('is_active', true).order('name').limit(60)
        return { servicos: (data ?? []).map(s => ({ servico: s.name, descricao: s.description, preco_base: brl(s.base_price) })) }
    },
})

// ─── Gestão (administrador) ──────────────────────────────────────────────────

const pendencias = defineRead({
    name: 'ver_pendencias',
    label: 'Verificando pendências',
    description: 'Pendências detectadas em todos os módulos: OS paradas, estoque baixo, contas, agendamentos, aniversários etc.',
    roles: MANAGERS,
    schema: z.object({}),
    async run(ctx) {
        const alerts = await collectAlerts(ctx.db, ctx.companyId, todayInStore())
        return { total: alerts.length, pendencias: alerts.slice(0, 25).map(a => ({ modulo: a.module, titulo: a.title, detalhe: a.detail, gravidade: a.severity, data: formatDate(a.date) })) }
    },
})

const resumoFinanceiro = defineRead({
    name: 'resumo_financeiro',
    label: 'Calculando o resumo financeiro',
    description: 'Vendas do PDV, OS faturadas e situação do caixa em um período.',
    roles: ADMIN_ROLES,
    schema: z.object({ periodo: z.enum(['hoje', 'ontem', 'semana', 'mes']).describe('semana = últimos 7 dias; mes = mês atual') }),
    async run(ctx, { periodo }) {
        const today = todayInStore()
        const start = periodo === 'hoje' ? today : periodo === 'ontem' ? addDays(today, -1) : periodo === 'semana' ? addDays(today, -6) : `${today.slice(0, 8)}01`
        const end = periodo === 'ontem' ? today : addDays(today, 1)
        const from = localToIso(start, '00:00'), to = localToIso(end, '00:00')
        const [sales, billed, register] = await Promise.all([
            ctx.db.from('sales').select('final_amount, total_cost, status').eq('company_id', ctx.companyId).gte('created_at', from).lt('created_at', to),
            ctx.db.from('service_orders').select('final_cost, parts_cost').eq('company_id', ctx.companyId).eq('status', 'faturada').gte('updated_at', from).lt('updated_at', to),
            ctx.db.from('cash_registers').select('id, opened_at, opening_balance').eq('company_id', ctx.companyId).eq('status', 'open').order('opened_at', { ascending: false }).limit(1).maybeSingle(),
        ])
        const okSales = (sales.data ?? []).filter(s => s.status !== 'cancelled' && s.status !== 'cancelada')
        const salesTotal = okSales.reduce((s, r) => s + Number(r.final_amount || 0), 0)
        const salesCost = okSales.reduce((s, r) => s + Number(r.total_cost || 0), 0)
        const osTotal = (billed.data ?? []).reduce((s, r) => s + Number(r.final_cost || 0), 0)
        const osParts = (billed.data ?? []).reduce((s, r) => s + Number(r.parts_cost || 0), 0)
        let caixa: Row = { aberto: false }
        if (register.data) {
            const { data: tx } = await ctx.db.from('cash_transactions').select('type, amount').eq('cash_register_id', register.data.id)
            const balance = (tx ?? []).reduce((s, t) => s + (t.type === 'entry' ? 1 : -1) * Number(t.amount || 0), Number(register.data.opening_balance || 0))
            caixa = { aberto: true, aberto_em: formatDateTime(register.data.opened_at), saldo_atual: brl(balance) }
        }
        return {
            periodo: `${formatDate(start)} a ${formatDate(addDays(end, -1))}`,
            vendas_pdv: { quantidade: okSales.length, total: brl(salesTotal), custo: brl(salesCost), lucro_bruto: brl(salesTotal - salesCost) },
            os_faturadas: { quantidade: billed.data?.length ?? 0, total: brl(osTotal), custo_pecas: brl(osParts) },
            faturamento_total: brl(salesTotal + osTotal),
            caixa,
        }
    },
})

const minhasTarefas = defineRead({
    name: 'ver_tarefas',
    label: 'Consultando suas tarefas',
    description: 'Tarefas em aberto do módulo Tarefas: atrasadas, de hoje e dos próximos dias.',
    roles: ADMIN_ROLES,
    schema: z.object({ dias: z.number().int().min(1).max(14).optional().describe('Quantos dias à frente (padrão 1 = só hoje)') }),
    async run(ctx, i) {
        const today = todayInStore()
        const until = addDays(today, (i.dias ?? 1) - 1)
        const { data } = await ctx.db.from('tasks')
            .select('title, do_date, do_time, priority, deadline, notes')
            .eq('company_id', ctx.companyId).eq('status', 'open').not('do_date', 'is', null).lte('do_date', until)
            .order('do_date').order('do_time', { nullsFirst: false }).limit(40)
        const prio = ['', 'urgente', 'alta', 'normal', 'baixa']
        return { tarefas: (data ?? []).map(t => ({ tarefa: t.title, dia: t.do_date < today ? `atrasada (${formatDate(t.do_date)})` : formatDate(t.do_date), hora: t.do_time?.slice(0, 5) ?? null, prioridade: prio[t.priority] ?? 'normal', prazo: formatDate(t.deadline), notas: t.notes })) }
    },
})

const criarTarefa = defineWrite({
    name: 'criar_tarefa',
    label: 'Preparando tarefa',
    description: 'Cria uma tarefa no módulo Tarefas do administrador, com lembrete no celular quando tiver horário.',
    roles: ADMIN_ROLES,
    schema: z.object({
        titulo: z.string().min(2).max(300),
        data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('AAAA-MM-DD (padrão hoje)'),
        hora: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        prioridade: z.enum(['urgente', 'alta', 'normal', 'baixa']).optional(),
        notas: z.string().max(2000).optional(),
    }),
    async preview(_ctx, i) {
        const day = i.data ?? todayInStore()
        return { title: 'Nova tarefa', lines: [i.titulo, `${formatDate(day)}${i.hora ? ` às ${i.hora}` : ''}${i.hora ? ' · com lembrete' : ''}`, i.prioridade && i.prioridade !== 'normal' ? `Prioridade ${i.prioridade}` : null, i.notas].filter(Boolean) as string[] }
    },
    async execute(ctx, i) {
        const day = i.data ?? todayInStore()
        const priority = { urgente: 1, alta: 2, normal: 3, baixa: 4 }[i.prioridade ?? 'normal']
        const { data, error } = await ctx.db.from('tasks').insert({
            company_id: ctx.companyId, user_id: ctx.user?.id ?? null, title: i.titulo, notes: i.notas ?? null,
            priority, do_date: day, do_time: i.hora ?? null,
        }).select('id').single()
        if (error || !data) throw new ToolError('Não foi possível criar a tarefa.')
        if (i.hora) {
            const at = localToIso(day, i.hora)
            if (new Date(at).getTime() > Date.now()) {
                await ctx.db.from('task_reminders').insert({ company_id: ctx.companyId, task_id: data.id, remind_at: at })
            }
        }
        return { message: `Tarefa criada: ${i.titulo}.`, href: `/tarefas?task=${data.id}` }
    },
})

export const STAFF_TOOLS: AnyTool[] = [
    buscarClientes, verCliente, cadastrarCliente, atualizarCliente,
    buscarOrdens, verOrdem, criarOrdem, atualizarStatus, anotarOrdem, atribuirTecnico,
    agenda, agendar, listarTecnicos, consultarEstoque, consultarAparelhos, listarServicos,
    pendencias, resumoFinanceiro, minhasTarefas, criarTarefa,
]

export function staffToolsFor(role: string) {
    return STAFF_TOOLS.filter(t => !t.roles || t.roles.includes(role))
}

export type { ToolContext }
