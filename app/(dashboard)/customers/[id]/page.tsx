import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Cake, ChevronRight, ClipboardList, Mail, MapPin, MessageCircle, Pencil, Phone, ShoppingBag, Smartphone, Star } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase'
import Header from '@/components/layout/Header'
import OSStatusBadge from '@/components/os/OSStatusBadge'
import CustomerActions from '@/components/customers/CustomerActions'
import TagEditor from './TagEditor'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const date = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)

function wa(phone?: string | null) {
    const d = (phone ?? '').replace(/\D/g, '')
    if (d.length < 10) return null
    return d.startsWith('55') && d.length >= 12 ? d : `55${d}`
}

/** Ficha do cliente: everything about them on one screen. */
export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const { userId } = await auth()
    if (!userId) redirect('/entrar')
    const db = createAdminClient()
    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId).single()
    const companyId = user?.company_id
    if (!companyId) redirect('/dashboard')

    const [{ data: c }, { data: orders }, { data: sales }, { data: payments }, { data: devices }, { data: ratings }, { data: messages }] = await Promise.all([
        db.from('customers').select('*').eq('id', id).eq('company_id', companyId).maybeSingle(),
        db.from('service_orders').select('id, order_number, title, equipment_description, equipment_serial, status, final_cost, estimated_cost, created_at').eq('customer_id', id).eq('company_id', companyId).order('created_at', { ascending: false }).limit(100),
        db.from('sales').select('id, created_at, final_amount, status, sale_items(item_name, quantity)').eq('customer_id', id).eq('company_id', companyId).order('created_at', { ascending: false }).limit(100),
        db.from('payments').select('id, amount, payment_status, payment_date, due_date, notes').eq('customer_id', id).eq('company_id', companyId).order('payment_date', { ascending: false }).limit(500),
        db.from('devices').select('id, brand, model, storage, sold_at, sold_price, warranty_until').eq('sold_customer_id', id).eq('company_id', companyId).order('sold_at', { ascending: false }),
        db.from('customer_ratings').select('rating, comment, created_at').eq('customer_id', id).order('created_at', { ascending: false }).limit(10),
        db.from('customer_messages').select('kind, text, status, created_at').eq('customer_id', id).eq('company_id', companyId).order('created_at', { ascending: false }).limit(10),
    ])
    if (!c) notFound()

    const done = (payments ?? []).filter(p => p.payment_status === 'completed')
    const spent = done.reduce((s, p) => s + Number(p.amount || 0), 0)
    const pending = (payments ?? []).filter(p => p.payment_status === 'pending')
    const debt = pending.reduce((s, p) => s + Number(p.amount || 0), 0)
    const visits = [...(orders ?? []).map(o => o.created_at), ...(sales ?? []).map(s => s.created_at)].sort().reverse()
    const lastVisit = visits[0] ?? null
    const avgRating = ratings?.length ? ratings.reduce((s, r) => s + Number(r.rating || 0), 0) / ratings.length : null

    // Devices: the ones they brought for repair + the ones they bought here.
    const seen = new Set<string>()
    const gadgets: { label: string; detail: string }[] = []
    for (const d of devices ?? []) {
        const label = [d.brand, d.model, d.storage].filter(Boolean).join(' ')
        seen.add(label.toLowerCase())
        gadgets.push({ label, detail: `comprado aqui${d.sold_at ? ` em ${date(d.sold_at)}` : ''}${d.warranty_until ? ` · garantia até ${new Date(`${d.warranty_until}T12:00:00`).toLocaleDateString('pt-BR')}` : ''}` })
    }
    for (const o of orders ?? []) {
        const label = o.equipment_description || o.title
        if (!label || seen.has(label.toLowerCase())) continue
        seen.add(label.toLowerCase())
        gadgets.push({ label, detail: `em OS${o.equipment_serial ? ` · ${o.equipment_serial}` : ''}` })
    }

    const phone = wa(c.phone)
    const where = [c.address, c.city, c.state].filter(Boolean).join(', ')

    return (
        <div className="min-h-full bg-background">
            <Header title="Cliente" />
            <div className="max-w-3xl mx-auto px-4 lg:px-8 pt-4 pb-16 space-y-5">
                <section className="rounded-2xl bg-card border border-border/60 p-5">
                    <div className="flex items-start gap-4">
                        <span className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[20px] font-semibold shrink-0">{c.name?.charAt(0).toUpperCase()}</span>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-[22px] font-semibold leading-tight">{c.name}</h1>
                            <p className="text-[14px] text-muted-foreground">Cliente desde {date(c.created_at)}{lastVisit ? ` · última visita há ${daysSince(lastVisit)} dias` : ''}</p>
                            <div className="mt-2"><TagEditor customerId={c.id} initial={(c.tags ?? []) as string[]} /></div>
                        </div>
                        <CustomerActions customerId={c.id} customerName={c.name} />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                        {phone && <a href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer" className="h-11 rounded-xl bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 inline-flex items-center justify-center gap-1.5 text-[15px] font-medium"><MessageCircle className="w-4 h-4" /> WhatsApp</a>}
                        {c.phone && <a href={`tel:${c.phone.replace(/\D/g, '')}`} className="h-11 rounded-xl bg-foreground/[0.06] inline-flex items-center justify-center gap-1.5 text-[15px] font-medium"><Phone className="w-4 h-4" /> Ligar</a>}
                        <Link href={`/customers/${c.id}/edit`} className="h-11 rounded-xl bg-foreground/[0.06] inline-flex items-center justify-center gap-1.5 text-[15px] font-medium"><Pencil className="w-4 h-4" /> Editar</Link>
                    </div>
                </section>

                <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Tile label="Total gasto" value={brl(spent)} />
                    <Tile label="Visitas" value={String(visits.length)} />
                    <Tile label="Devendo" value={brl(debt)} tone={debt > 0 ? 'bad' : undefined} href={debt > 0 ? '/contas?aba=receber' : undefined} />
                    <Tile label="Avaliação" value={avgRating ? `${avgRating.toFixed(1)} ★` : '—'} />
                </section>

                <Section title="Contato">
                    {c.phone && <Row icon={<Phone className="w-4 h-4" />} text={c.phone} />}
                    {c.email && <Row icon={<Mail className="w-4 h-4" />} text={c.email} />}
                    {c.cpf_cnpj && <Row icon={<span className="text-[11px] font-semibold">CPF</span>} text={c.cpf_cnpj} />}
                    {c.birth_date && <Row icon={<Cake className="w-4 h-4" />} text={new Date(`${c.birth_date}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })} />}
                    {where && <Row icon={<MapPin className="w-4 h-4" />} text={where} />}
                    {c.notes && <p className="px-4 py-3 text-[15px] text-muted-foreground whitespace-pre-line">{c.notes}</p>}
                    {!c.phone && !c.email && !where && !c.cpf_cnpj && <p className="px-4 py-3 text-[15px] text-muted-foreground">Sem contato. <Link href={`/customers/${c.id}/edit`} className="text-primary">Completar cadastro</Link></p>}
                </Section>

                {gadgets.length > 0 && (
                    <Section title="Aparelhos">
                        {gadgets.map((g, i) => <Row key={i} icon={<Smartphone className="w-4 h-4" />} text={g.label} sub={g.detail} />)}
                    </Section>
                )}

                {pending.length > 0 && (
                    <Section title="A receber" action={<Link href="/contas?aba=receber" className="text-[15px] text-primary">Contas</Link>}>
                        {pending.map(p => (
                            <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                <span className="min-w-0"><span className="block text-[15px] truncate">{p.notes || 'Conta em aberto'}</span><span className="block text-[13px] text-muted-foreground">{p.due_date ? `vence ${new Date(`${p.due_date}T12:00:00`).toLocaleDateString('pt-BR')}` : 'sem vencimento'}</span></span>
                                <span className="text-[15px] font-semibold tabular-nums text-red-600 dark:text-red-400">{brl(Number(p.amount))}</span>
                            </div>
                        ))}
                    </Section>
                )}

                <Section title={`Ordens de serviço (${orders?.length ?? 0})`} action={<Link href="/service-orders/new" className="text-[15px] text-primary">Nova OS</Link>}>
                    {orders?.length ? orders.slice(0, 20).map(o => (
                        <Link key={o.id} href={`/service-orders/${o.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-foreground/[0.02]">
                            <ClipboardList className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="flex-1 min-w-0"><span className="block text-[15px] font-medium truncate">{[o.equipment_description, o.title].filter(Boolean).join(' · ') || o.order_number}</span><span className="block text-[13px] text-muted-foreground">{o.order_number} · {date(o.created_at)}</span></span>
                            <span className="flex flex-col items-end gap-1 shrink-0"><OSStatusBadge status={o.status} /><span className="text-[13px] tabular-nums">{brl(Number(o.final_cost || o.estimated_cost || 0))}</span></span>
                        </Link>
                    )) : <p className="px-4 py-4 text-[15px] text-muted-foreground">Nenhuma OS.</p>}
                </Section>

                <Section title={`Compras (${sales?.length ?? 0})`}>
                    {sales?.length ? sales.slice(0, 20).map(s => (
                        <Link key={s.id} href={`/pdv/recibo/${s.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-foreground/[0.02]">
                            <ShoppingBag className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="flex-1 min-w-0"><span className="block text-[15px] truncate">{(s.sale_items ?? []).map((i: { item_name: string; quantity: number }) => `${Number(i.quantity)}× ${i.item_name}`).join(', ') || 'Venda'}</span><span className="block text-[13px] text-muted-foreground">{date(s.created_at)}{s.status === 'cancelled' ? ' · devolvida' : ''}</span></span>
                            <span className="text-[15px] tabular-nums shrink-0">{brl(Number(s.final_amount || 0))}</span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                        </Link>
                    )) : <p className="px-4 py-4 text-[15px] text-muted-foreground">Nenhuma compra no PDV.</p>}
                </Section>

                {(ratings?.length ?? 0) > 0 && (
                    <Section title="Avaliações">
                        {ratings!.map((r, i) => <Row key={i} icon={<Star className="w-4 h-4 text-amber-500" />} text={`${'★'.repeat(Number(r.rating))}${r.comment ? ` · ${r.comment}` : ''}`} sub={date(r.created_at)} />)}
                    </Section>
                )}

                {(messages?.length ?? 0) > 0 && (
                    <Section title="Mensagens automáticas">
                        {messages!.map((m, i) => <Row key={i} icon={<MessageCircle className="w-4 h-4" />} text={m.text ?? ''} sub={`${m.kind === 'birthday' ? 'Aniversário' : m.kind === 'review' ? 'Pedido de avaliação' : 'Campanha'} · ${date(m.created_at)}${m.status === 'failed' ? ' · falhou' : ''}`} />)}
                    </Section>
                )}
            </div>
        </div>
    )
}

function Tile({ label, value, tone, href }: { label: string; value: string; tone?: 'bad'; href?: string }) {
    const body = (
        <>
            <p className="text-[12px] text-muted-foreground">{label}</p>
            <p className={`text-[17px] font-semibold tabular-nums truncate ${tone === 'bad' ? 'text-red-600 dark:text-red-400' : ''}`}>{value}</p>
        </>
    )
    return href
        ? <Link href={href} className="rounded-2xl bg-card border border-border/60 p-3 min-w-0">{body}</Link>
        : <div className="rounded-2xl bg-card border border-border/60 p-3 min-w-0">{body}</div>
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
    return (
        <section className="space-y-1.5">
            <div className="flex items-end justify-between px-4"><h2 className="text-[13px] font-medium text-muted-foreground">{title}</h2>{action}</div>
            <div className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60 overflow-hidden">{children}</div>
        </section>
    )
}

function Row({ icon, text, sub }: { icon: React.ReactNode; text: string; sub?: string }) {
    return (
        <div className="flex items-center gap-3 px-4 py-3">
            <span className="w-7 h-7 rounded-full bg-foreground/[0.06] text-muted-foreground flex items-center justify-center shrink-0">{icon}</span>
            <span className="min-w-0"><span className="block text-[15px] truncate">{text}</span>{sub && <span className="block text-[13px] text-muted-foreground truncate">{sub}</span>}</span>
        </div>
    )
}
