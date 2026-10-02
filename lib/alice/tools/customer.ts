import { z } from 'zod'
import { defineCustomer, ToolError, type AnyTool, type ToolContext } from './types'
import { OS_STATUS_LABELS, brl, cleanSearch, formatDate, formatDateTime } from './helpers'
import { appUrl, ADMIN_ROLES } from '../config'
import { formatWhatsApp } from '../phone'
import { pushToCompany } from '@/lib/tasks/reminders'
import { buildQuoteMessage, createPartQuote, findQuoteOptions, sortQuoteOptions, type PartQuoteOption } from '@/lib/parts/quotes'
import { loadPartMargin } from '@/lib/parts/prices'
import { suggestedPrice } from '@/lib/parts/server'
import { searchNovaPecasTiers } from '@/lib/parts/novapecas'

/**
 * Tools for the WhatsApp agent. None of them takes an id from the model:
 * everything is scoped to the phone number the message came from, so a
 * customer can never see another customer's data, whatever they write.
 */

type Row = Record<string, unknown>

/** What the customer may see about their own service orders (no costs, no internal notes). */
const CUSTOMER_STATUS: Record<string, string> = {
    ...OS_STATUS_LABELS,
    aberta: 'Recebido, aguardando análise',
    em_andamento: 'Em reparo',
    aguardando_pecas: 'Aguardando peças',
    concluida: 'Pronto para retirada',
    faturada: 'Entregue',
}

const minhasOrdens = defineCustomer({
    name: 'minhas_ordens',
    label: 'Consultando os serviços do cliente',
    description: 'Ordens de serviço do cliente que está conversando (identificado pelo número de WhatsApp). Traz status, aparelho, valor do orçamento e link de acompanhamento.',
    schema: z.object({}),
    async run(ctx) {
        const ids = ctx.customer?.customerIds ?? []
        if (!ids.length) return { encontrado: false, aviso: 'Nenhum cadastro com este número de WhatsApp. Peça o nome completo ou o número da OS e chame um atendente se precisar.' }
        const { data, error } = await ctx.db
            .from('service_orders')
            .select('order_number, title, status, equipment_description, estimated_cost, final_cost, created_at, updated_at, scheduled_date, completed_at, tracking_token, warranty_months')
            .eq('company_id', ctx.companyId)
            .in('customer_id', ids)
            .order('created_at', { ascending: false })
            .limit(8)
        if (error) throw new ToolError('Não consegui consultar agora.')
        return {
            encontrado: true,
            ordens: (data ?? []).map(o => ({
                numero: o.order_number,
                servico: o.title,
                aparelho: o.equipment_description,
                situacao: CUSTOMER_STATUS[o.status] ?? o.status,
                orcamento: Number(o.estimated_cost) > 0 ? brl(o.estimated_cost) : null,
                valor_final: Number(o.final_cost) > 0 ? brl(o.final_cost) : null,
                recebido_em: formatDate(o.created_at),
                previsao_ou_agendamento: formatDateTime(o.scheduled_date),
                concluido_em: formatDate(o.completed_at),
                garantia_meses: o.warranty_months || null,
                acompanhar: o.tracking_token ? `${appUrl()}/tracking/${o.tracking_token}` : null,
            })),
        }
    },
})

const infoLoja = defineCustomer({
    name: 'informacoes_da_loja',
    label: 'Consultando informações da loja',
    description: 'Dados da loja (endereço, telefone), informações definidas pelo dono (horário, formas de pagamento, políticas) e a tabela de serviços com preço base.',
    schema: z.object({}),
    async run(ctx) {
        const [company, settings, services] = await Promise.all([
            ctx.db.from('companies').select('name, phone, email, address, city, state, warranty_terms').eq('id', ctx.companyId).single(),
            ctx.db.from('alice_settings').select('store_info').eq('company_id', ctx.companyId).maybeSingle(),
            ctx.db.from('service_types').select('name, description, base_price').eq('company_id', ctx.companyId).eq('is_active', true).order('name').limit(40),
        ])
        const c = company.data as Row | null
        return {
            loja: c?.name ?? null,
            endereco: [c?.address, c?.city, c?.state].filter(Boolean).join(', ') || null,
            telefone: c?.phone ?? null,
            informacoes_do_dono: settings.data?.store_info ?? null,
            garantia: c?.warranty_terms ?? null,
            servicos: (services.data ?? []).map(s => ({ servico: s.name, descricao: s.description, a_partir_de: Number(s.base_price) > 0 ? brl(s.base_price) : null })),
        }
    },
})

const aparelhosAVenda = defineCustomer({
    name: 'aparelhos_a_venda',
    label: 'Consultando aparelhos à venda',
    description: 'Celulares disponíveis para venda na loja, com condição, bateria e preços.',
    schema: z.object({ busca: z.string().max(60).optional().describe('Marca ou modelo') }),
    async run(ctx, i) {
        let q = ctx.db.from('devices')
            .select('brand, model, storage, color, condition, battery_health, cash_price, installment_price')
            .eq('company_id', ctx.companyId).eq('status', 'available').order('created_at', { ascending: false }).limit(15)
        if (i.busca) {
            const t = cleanSearch(i.busca)
            q = q.or(`brand.ilike.%${t}%,model.ilike.%${t}%`)
        }
        const { data } = await q
        return { aparelhos: (data ?? []).map(d => ({ aparelho: [d.brand, d.model, d.storage, d.color].filter(Boolean).join(' '), condicao: d.condition, bateria: d.battery_health ? `${d.battery_health}%` : null, a_vista: brl(d.cash_price), parcelado: d.installment_price ? brl(d.installment_price) : null })) }
    },
})

/** Per chat per day, so a customer can't flood the store's notifications. */
const MAX_REQUESTS_PER_DAY = 5

/** Heads-up for the store's admins about this conversation (bell + push) — no task, staff act straight from the conversation itself. */
async function notifyStore(ctx: ToolContext, title: string, detail: string) {
    const { count } = await ctx.db
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', ctx.companyId)
        .eq('related_entity_type', 'alice_conversation')
        .eq('related_entity_id', ctx.conversationId)
        .gte('created_at', new Date(Date.now() - 86_400_000).toISOString())
    if ((count ?? 0) >= MAX_REQUESTS_PER_DAY) return
    const channelLabel = ctx.channel === 'instagram' ? 'Instagram' : 'WhatsApp'
    const who = ctx.customer?.name || (ctx.customer?.phone ? formatWhatsApp(ctx.customer.phone) : ctx.customer?.instagramUsername ? `@${ctx.customer.instagramUsername}` : 'Cliente')
    const { data: admins } = await ctx.db.from('users').select('id').eq('company_id', ctx.companyId).in('role', ADMIN_ROLES).eq('is_active', true)
    if (admins?.length) {
        await ctx.db.from('notifications').insert(admins.map(a => ({
            company_id: ctx.companyId, user_id: a.id, type: 'push', status: 'pending',
            title: `${channelLabel}: ${title}`, message: `${who}: ${detail}`.slice(0, 500),
            related_entity_type: 'alice_conversation', related_entity_id: ctx.conversationId,
        })))
    }
    await pushToCompany(ctx.db, ctx.companyId, {
        title: `${channelLabel}: ${title}`,
        body: `${who}: ${detail}`.slice(0, 180),
        url: `/alice?conversa=${ctx.conversationId}`,
        tag: `alice-${ctx.conversationId}`,
    }).catch(err => console.error('[alice] push failed:', err))
}

const cotarPeca = defineCustomer({
    name: 'cotar_peca',
    label: 'Consultando preço de peça',
    description: 'Consulta os preços já cadastrados na tabela de Peças para um aparelho e um serviço (ex.: troca de tela, troca de bateria). Quando a loja tem mais de uma opção de qualidade para a mesma peça (Genuína, Premium, Standard), traz todas. Se nada estiver cadastrado e a loja tiver ligado "Cotar peças automaticamente", consulta o preço ao vivo no fornecedor e aplica a margem da loja, pra responder o cliente na hora mesmo sem cadastro. Use isso antes de registrar_pedido quando o cliente perguntar quanto custa um reparo.',
    schema: z.object({
        aparelho: z.string().min(2).max(80).describe('Marca e modelo do aparelho, como o cliente descreveu'),
        servico: z.string().min(2).max(60).describe('Serviço, ex.: "troca de tela", "troca de bateria"'),
    }),
    async run(ctx, { aparelho, servico }) {
        const [foundRow, { data: aliceSettings }] = await Promise.all([
            findQuoteOptions(ctx.db, ctx.companyId, aparelho, servico),
            ctx.db.from('alice_settings').select('auto_quote_parts').eq('company_id', ctx.companyId).maybeSingle(),
        ])
        let found = foundRow
        // Nada cadastrado, mas a loja confia a Alice a cotar sozinha: tenta o preço ao vivo do fornecedor,
        // separado pelas 3 linhas de marca dele (Genuína/Premium/Standard), igual a tabela de Peças traria.
        if (!found?.options.length && aliceSettings?.auto_quote_parts) {
            try {
                const tiers = await searchNovaPecasTiers(`${servico} ${aparelho}`)
                if (tiers.length) {
                    const { margin, laborMin } = await loadPartMargin(ctx.db, ctx.companyId)
                    const options: PartQuoteOption[] = tiers.map(t => ({ tipo: t.tipo, valor: suggestedPrice(t.custo, 0, margin, laborMin) }))
                    found = { deviceModel: aparelho, options }
                }
            } catch { /* fornecedor fora do ar: segue sem cotação, cai no aviso abaixo */ }
        }
        if (!found?.options.length) return { encontrado: false, instrucao: 'Nada cadastrado para esse aparelho/serviço. Use registrar_pedido para a loja preparar o orçamento.' }

        const { deviceModel } = found
        const opcoesNum = sortQuoteOptions(found.options)
        const opcoes = opcoesNum.map(o => ({ tipo: o.tipo, valor: brl(o.valor) }))
        const token = await createPartQuote(ctx.db, ctx.companyId, {
            deviceModel, service: servico, options: opcoesNum,
            customerName: ctx.customer?.name ?? null, customerPhone: ctx.customer?.phone ?? null,
        })
        const link = token ? `${appUrl()}/orcamento/${token}` : null

        if (aliceSettings?.auto_quote_parts) {
            const mensagem_sugerida = buildQuoteMessage(deviceModel, servico, opcoesNum, link ?? '')
            return { encontrado: true, pode_informar_ao_cliente: true, opcoes, link, mensagem_sugerida, instrucao: 'Mande a mensagem_sugerida ao cliente quase como está (pode ajustar o tom, mas mantenha os valores e o link).' }
        }
        await notifyStore(ctx, `Orçamento calculado: ${servico} · ${deviceModel}`, `${opcoes.map(o => `${o.tipo ? o.tipo + ': ' : ''}${o.valor}`).join(' / ')}${link ? ` — ${link}` : ''}`)
        return { encontrado: true, pode_informar_ao_cliente: false, instrucao: 'Não informe nenhum valor nem o link. Diga ao cliente que a loja já está com o orçamento calculado e vai confirmar e enviar em instantes.' }
    },
})

const chamarAtendente = defineCustomer({
    name: 'chamar_atendente',
    label: 'Chamando um atendente',
    description: 'Passa a conversa para uma pessoa da loja. Use quando o cliente pedir, estiver insatisfeito, quiser negociar preço/desconto, reclamar, ou quando você não tiver a informação. Depois disso você para de responder nesta conversa.',
    schema: z.object({ motivo: z.string().min(3).max(500).describe('Resumo do que o cliente precisa') }),
    async run(ctx, { motivo }) {
        await ctx.db.from('alice_conversations').update({ mode: 'human' }).eq('id', ctx.conversationId).eq('company_id', ctx.companyId)
        await notifyStore(ctx, 'Cliente pediu atendimento', motivo)
        return { ok: true, instrucao: 'Avise o cliente, em uma frase, que um atendente da loja vai continuar a conversa em breve.' }
    },
})

const registrarPedido = defineCustomer({
    name: 'registrar_pedido',
    label: 'Registrando o pedido',
    description: 'Registra para a equipe um pedido do cliente que precisa de ação humana (orçamento, agendamento de visita, reserva de aparelho, retorno de ligação). A loja confirma com o cliente depois — nunca prometa data, preço ou reserva como garantidos.',
    schema: z.object({
        tipo: z.enum(['orcamento', 'agendamento', 'reserva_aparelho', 'retorno', 'outro']),
        descricao: z.string().min(5).max(1000).describe('Aparelho, defeito, preferência de dia/horário etc.'),
        nome_informado: z.string().max(120).optional().describe('Nome que o cliente informou, se não tiver cadastro'),
    }),
    async run(ctx, i) {
        const labels = { orcamento: 'Pedido de orçamento', agendamento: 'Pedido de agendamento', reserva_aparelho: 'Reserva de aparelho', retorno: 'Pediu retorno', outro: 'Pedido do cliente' }
        if (i.nome_informado && !ctx.customer?.name) {
            await ctx.db.from('alice_conversations').update({ customer_name: i.nome_informado }).eq('id', ctx.conversationId)
            if (ctx.customer) ctx.customer.name = i.nome_informado
        }
        await notifyStore(ctx, labels[i.tipo], i.descricao)
        return { ok: true, instrucao: 'Confirme ao cliente que o pedido foi registrado e que a loja vai retornar.' }
    },
})

export const CUSTOMER_TOOLS: AnyTool[] = [minhasOrdens, infoLoja, aparelhosAVenda, cotarPeca, chamarAtendente, registrarPedido]
