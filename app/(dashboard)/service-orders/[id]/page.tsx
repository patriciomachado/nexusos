import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'
import Header from '@/components/layout/Header'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Check, ChevronLeft, Phone } from 'lucide-react'
import { formatDateTime, formatCurrency, cn } from '@/lib/utils'
import OSDetailActions from '@/components/os/OSDetailActions'
import OSStatusBadge from '@/components/os/OSStatusBadge'
import OSGallery from '@/components/os/OSGallery'
import OSSecurityView from '@/components/os/OSSecurityView'
import { parseInternalNotes } from '@/lib/os/notes'
import { OS_PRIORITY, OS_STATUS } from '@/lib/os/status'

type Row = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

function Group({ title, children, footer }: { title?: string; children: React.ReactNode; footer?: React.ReactNode }) {
    return (
        <section className="space-y-1.5">
            {title && <h2 className="px-4 text-[13px] font-medium text-muted-foreground">{title}</h2>}
            <div className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60 overflow-hidden">{children}</div>
            {footer && <div className="px-4 text-[13px] text-muted-foreground">{footer}</div>}
        </section>
    )
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="px-4 py-3 flex items-start justify-between gap-4">
            <span className="text-[15px] text-muted-foreground shrink-0">{label}</span>
            <span className="text-[15px] text-right min-w-0 break-words">{children}</span>
        </div>
    )
}

function Text({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="px-4 py-3">
            <p className="text-[13px] text-muted-foreground mb-0.5">{label}</p>
            <p className="text-[17px] leading-snug whitespace-pre-line break-words">{children}</p>
        </div>
    )
}

const HISTORY_FIELDS: Record<string, string> = { status: 'Situação', technician_id: 'Técnico', priority: 'Prioridade' }

/** Shows stored values the way the app names them (status "em_andamento" → "Em andamento"). */
function historyValue(field: string, value: string) {
    if (field === 'status') return OS_STATUS[value]?.label ?? value
    if (field === 'priority') return OS_PRIORITY[value]?.label ?? value
    return value
}

export default async function ServiceOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { userId } = await auth()
    const { id } = await params
    const db = createAdminClient()

    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId!).single()
    const { data: os } = await db
        .from('service_orders')
        .select(`
      *,
      customers(name, phone, email, address, city),
      technicians(name, phone),
      service_order_items(*),
      service_order_attachments(*),
      service_order_history(*, users(full_name))
    `)
        .eq('id', id)
        .eq('company_id', user?.company_id)
        .single()

    if (!os) notFound()

    const { cleanNotes, security } = parseInternalNotes(os.internal_notes)
    const customer = os.customers as Row | null
    const technician = os.technicians as Row | null
    const items = (os.service_order_items ?? []) as Row[]
    const itemsTotal = items.reduce((s, i) => s + (Number(i.total_price) || 0), 0)
    const subtotal = itemsTotal || Number(os.estimated_cost) || 0
    const discount = Number(os.discount_amount) || 0
    const total = Number(os.final_cost) || Math.max(0, subtotal - (itemsTotal ? discount : 0))
    const checklist = (Array.isArray(os.checklist_progress) ? os.checklist_progress : []) as Row[]
    const checked = checklist.filter(c => c.completed).length
    const history = [...((os.service_order_history ?? []) as Row[])].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    const priority = OS_PRIORITY[os.priority] ?? OS_PRIORITY.normal
    const phoneDigits = String(customer?.phone ?? '').replace(/\D/g, '')

    return (
        <div className="min-h-full bg-background">
            <Header title={os.order_number} />
            <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-3 pb-12">
                <Link href="/service-orders" className="inline-flex items-center gap-0.5 -ml-1.5 h-9 pr-2 text-[17px] text-primary">
                    <ChevronLeft className="w-5 h-5" /> Ordens de serviço
                </Link>

                {/* Summary */}
                <div className="mt-2 mb-5">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                        <OSStatusBadge status={os.status} />
                        {os.priority && os.priority !== 'normal' && <span className={cn('text-[13px] font-medium', priority.tone)}>Prioridade {priority.label.toLowerCase()}</span>}
                    </div>
                    <h1 className="text-[28px] leading-tight font-semibold tracking-tight break-words">
                        {[os.title, os.equipment_description].filter(Boolean).join(' · ') || os.order_number}
                    </h1>
                    <p className="mt-1 text-[15px] text-muted-foreground">
                        Aberta em {formatDateTime(os.created_at)}
                        {os.scheduled_date && <> · entrega prevista {formatDateTime(os.scheduled_date)}</>}
                    </p>
                </div>

                <OSDetailActions os={{ id: os.id, order_number: os.order_number, status: os.status, tracking_token: os.tracking_token, total, customer: customer ? { name: customer.name, phone: customer.phone } : null }} />

                <div className="mt-6 grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
                    <div className="space-y-6 min-w-0">
                        {/* Items */}
                        <Group title="Peças e serviços">
                            {items.length ? items.map(i => (
                                <div key={i.id} className="px-4 py-3 flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[17px] leading-snug break-words">{i.item_name}</p>
                                        <p className="text-[13px] text-muted-foreground tabular-nums">
                                            {Number(i.quantity)} × {formatCurrency(Number(i.unit_price))}{i.inventory_item_id ? ' · do estoque' : ''}
                                        </p>
                                    </div>
                                    <span className="text-[17px] tabular-nums shrink-0">{formatCurrency(Number(i.total_price))}</span>
                                </div>
                            )) : (
                                <p className="px-4 py-4 text-[15px] text-muted-foreground">
                                    Nenhum item ainda. <Link href={`/service-orders/${os.id}/edit`} className="text-primary">Adicionar orçamento</Link>
                                </p>
                            )}
                            {(items.length > 0 || total > 0) && (
                                <>
                                    {discount > 0 && itemsTotal > 0 && (
                                        <>
                                            <Line label="Subtotal"><span className="tabular-nums">{formatCurrency(subtotal)}</span></Line>
                                            <Line label="Desconto"><span className="tabular-nums text-red-600 dark:text-red-400">− {formatCurrency(discount)}</span></Line>
                                        </>
                                    )}
                                    <div className="px-4 py-3 flex items-center justify-between">
                                        <span className="text-[17px] font-semibold">Total</span>
                                        <span className="text-[22px] font-semibold tabular-nums">{formatCurrency(total)}</span>
                                    </div>
                                </>
                            )}
                        </Group>

                        {/* Problem */}
                        {(os.problem_description || os.description || os.solution_applied || os.device_condition) && (
                            <Group title="Problema e diagnóstico">
                                {os.problem_description && <Text label="Relato do cliente">{os.problem_description}</Text>}
                                {os.device_condition && <Text label="Estado na entrada">{os.device_condition}</Text>}
                                {os.description && <Text label="Laudo técnico">{os.description}</Text>}
                                {os.solution_applied && <Text label="Solução aplicada">{os.solution_applied}</Text>}
                            </Group>
                        )}

                        {checklist.length > 0 && (
                            <Group title={`Testes na entrada · ${checked} de ${checklist.length} funcionando`}>
                                <div className="p-3 grid grid-cols-2 gap-2">
                                    {checklist.map(c => (
                                        <div key={c.id} className={cn('min-h-[40px] px-3 py-2 rounded-xl text-[15px] leading-tight flex items-center gap-2', c.completed ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' : 'bg-foreground/[0.04] text-muted-foreground')}>
                                            {c.completed ? <Check className="w-4 h-4 shrink-0" strokeWidth={3} /> : <span className="w-4 h-4 shrink-0 rounded-full border-2 border-foreground/20" aria-label="não conferido" />}
                                            <span className="min-w-0">{c.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </Group>
                        )}

                        <OSGallery
                            devicesPhotos={{ photo_front_url: os.photo_front_url, photo_back_url: os.photo_back_url }}
                            attachments={os.service_order_attachments}
                        />

                        {history.length > 0 && (
                            <Group title="Histórico">
                                {history.map(h => (
                                    <div key={h.id} className="px-4 py-3">
                                        <p className="text-[15px] leading-snug">
                                            {h.field_name ? (
                                                <>
                                                    {HISTORY_FIELDS[h.field_name] ?? h.field_name}
                                                    {h.new_value ? <>: <span className="font-medium">{historyValue(h.field_name, h.new_value)}</span></> : ' alterado'}
                                                    {h.old_value && <span className="text-muted-foreground"> (era {historyValue(h.field_name, h.old_value)})</span>}
                                                </>
                                            ) : (h.change_reason || 'Atualização')}
                                        </p>
                                        {h.field_name && h.change_reason && <p className="text-[13px] text-muted-foreground mt-0.5">{h.change_reason}</p>}
                                        <p className="text-[13px] text-muted-foreground mt-0.5">
                                            {h.changed_by_name || h.users?.full_name || 'Sistema'} · {formatDateTime(h.created_at)}
                                        </p>
                                    </div>
                                ))}
                            </Group>
                        )}
                    </div>

                    <div className="space-y-6 min-w-0">
                        <Group title="Cliente">
                            {customer ? (
                                <>
                                    <div className="px-4 py-3">
                                        <p className="text-[17px] font-medium break-words">{customer.name}</p>
                                        {customer.email && <p className="text-[15px] text-muted-foreground break-all">{customer.email}</p>}
                                        {customer.address && <p className="text-[15px] text-muted-foreground">{customer.address}{customer.city ? `, ${customer.city}` : ''}</p>}
                                    </div>
                                    {phoneDigits && (
                                        <a href={`tel:${phoneDigits}`} className="px-4 min-h-[48px] flex items-center gap-3 text-primary">
                                            <Phone className="w-[18px] h-[18px]" />
                                            <span className="text-[17px] tabular-nums">{customer.phone}</span>
                                        </a>
                                    )}
                                </>
                            ) : <p className="px-4 py-3 text-[15px] text-muted-foreground">Sem cliente</p>}
                        </Group>

                        <Group title="Aparelho">
                            <Line label="Tipo">{os.title || '—'}</Line>
                            {os.equipment_description && <Line label="Modelo">{os.equipment_description}</Line>}
                            {os.equipment_serial && <Line label="Série / IMEI"><span className="font-mono text-[14px]">{os.equipment_serial}</span></Line>}
                            {os.turns_on === false && <Line label="Ligava na entrada">Não</Line>}
                            <Line label="Técnico">{technician?.name ?? <span className="text-muted-foreground">Nenhum</span>}</Line>
                            {Number(os.warranty_months) > 0 && <Line label="Garantia">{os.warranty_months} {Number(os.warranty_months) === 1 ? 'mês' : 'meses'}</Line>}
                            {os.terms_accepted && <Line label="Termos">Aceitos pelo cliente</Line>}
                        </Group>

                        {security && <OSSecurityView type={security.type} value={security.value} />}

                        {cleanNotes && (
                            <Group title="Observação interna">
                                <p className="px-4 py-3 text-[15px] whitespace-pre-line break-words">{cleanNotes}</p>
                            </Group>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
