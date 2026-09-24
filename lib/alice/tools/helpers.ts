import type { ToolContext } from './types'
import { ToolError } from './types'
import { dateStringInZone, DEFAULT_TIMEZONE } from '@/lib/tasks/dates'

export const OS_STATUS_LABELS: Record<string, string> = {
    aberta: 'Aberta',
    agendada: 'Agendada',
    em_andamento: 'Em andamento',
    aguardando_pecas: 'Aguardando peças',
    concluida: 'Concluída',
    faturada: 'Faturada',
    cancelada: 'Cancelada',
}

export const OS_PRIORITY_LABELS: Record<string, string> = {
    baixa: 'Baixa',
    normal: 'Normal',
    alta: 'Alta',
    urgente: 'Urgente',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string) {
    return UUID_RE.test(value)
}

/** Free text inside PostgREST filters: drop characters that change filter syntax. */
export function cleanSearch(value: string) {
    return value.replace(/[,()%*\\"':]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
}

export function brl(value: number | string | null | undefined) {
    const n = Number(value ?? 0)
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function todayInStore() {
    return dateStringInZone(DEFAULT_TIMEZONE)
}

/** "2026-09-24T14:00:00Z" → "24/09 11:00" in the store's time zone. */
export function formatDateTime(iso: string | null | undefined) {
    if (!iso) return null
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    return d.toLocaleString('pt-BR', { timeZone: DEFAULT_TIMEZONE, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function formatDate(iso: string | null | undefined) {
    if (!iso) return null
    const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso)
    if (Number.isNaN(d.getTime())) return null
    return d.toLocaleDateString('pt-BR', { timeZone: DEFAULT_TIMEZONE, day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Local date + time in the store (Brasília, no DST since 2019) → ISO instant. */
export function localToIso(date: string, time: string) {
    return new Date(`${date}T${time.length === 5 ? time + ':00' : time}-03:00`).toISOString()
}

/** Accepts "OS-00014", "#14", "14" or the record id. */
export function orderRef(ref: string): { column: 'id' | 'order_number'; value: string } {
    const clean = ref.trim().replace(/^#/, '')
    if (isUuid(clean)) return { column: 'id', value: clean }
    const digits = clean.replace(/\D/g, '')
    if (!digits) throw new ToolError(`Não entendi o número da OS "${ref}". Use o número, por exemplo OS-00014.`)
    return { column: 'order_number', value: `OS-${digits.padStart(5, '0')}` }
}

export async function findOrder(ctx: ToolContext, ref: string, columns = 'id, order_number, title, status, customer_id, technician_id, internal_notes') {
    const { column, value } = orderRef(ref)
    const { data, error } = await ctx.db
        .from('service_orders')
        .select(columns)
        .eq('company_id', ctx.companyId)
        .eq(column, value)
        .maybeSingle()
    if (error) throw new ToolError('Não consegui consultar a OS agora.')
    if (!data) throw new ToolError(`Não encontrei a OS ${value}.`)
    return data as unknown as Record<string, unknown> & { id: string; order_number: string; title: string; status: string }
}

export async function findCustomer(ctx: ToolContext, id: string) {
    if (!isUuid(id)) throw new ToolError('Cliente inválido. Busque o cliente primeiro para obter o id.')
    const { data } = await ctx.db
        .from('customers')
        .select('id, name, phone, email')
        .eq('company_id', ctx.companyId)
        .eq('id', id)
        .maybeSingle()
    if (!data) throw new ToolError('Cliente não encontrado nesta loja.')
    return data as { id: string; name: string; phone: string | null; email: string | null }
}

export async function findTechnician(ctx: ToolContext, id: string) {
    if (!isUuid(id)) throw new ToolError('Técnico inválido. Use listar_tecnicos para obter o id.')
    const { data } = await ctx.db
        .from('technicians')
        .select('id, name, user_id, is_active')
        .eq('company_id', ctx.companyId)
        .eq('id', id)
        .maybeSingle()
    if (!data) throw new ToolError('Técnico não encontrado nesta loja.')
    return data as { id: string; name: string; user_id: string | null; is_active: boolean }
}

export async function logOrderHistory(ctx: ToolContext, orderId: string, field: string, oldValue: string | null, newValue: string | null, reason: string) {
    await ctx.db.from('service_order_history').insert({
        service_order_id: orderId,
        changed_by: ctx.user?.id ?? null,
        changed_by_name: ctx.user?.name ? `${ctx.user.name} (via Alice)` : 'Alice',
        field_name: field,
        old_value: oldValue,
        new_value: newValue,
        change_reason: reason,
    })
}

/** Next "OS-00001" style number, same rule as the service orders API. */
export async function nextOrderNumber(ctx: ToolContext) {
    const { data: last } = await ctx.db
        .from('service_orders')
        .select('order_number')
        .eq('company_id', ctx.companyId)
        .order('order_number', { ascending: false })
        .limit(1)
        .maybeSingle()
    let next = 1
    if (last?.order_number) {
        const n = parseInt(String(last.order_number).replace('OS-', ''))
        if (!Number.isNaN(n)) next = n + 1
    }
    return `OS-${String(next).padStart(5, '0')}`
}
