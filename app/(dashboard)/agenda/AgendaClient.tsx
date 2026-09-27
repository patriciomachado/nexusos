'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Bell, Check, ChevronLeft, ChevronRight, ClipboardList, Loader2, MapPin, MessageCircle, Pencil, Phone, Play, Plus, Settings2, Trash2, X } from 'lucide-react'
import Header from '@/components/layout/Header'
import Sheet from '@/components/tasks/Sheet'
import PremiumConfirmDialog from '@/components/ui/PremiumConfirmDialog'
import AppointmentForm from '@/components/appointments/AppointmentForm'
import { Group, PrimaryButton, SecondaryButton, SwitchRow } from '@/components/ui/form'
import { cn } from '@/lib/utils'

/**
 * Agenda: the week at a glance, each day's appointments in time order, and
 * one tap to confirm, start, finish or remind the customer on WhatsApp.
 * Reminders can also go out on their own the day before.
 */

type One<T> = T | T[] | null | undefined
export interface Appointment {
    id: string
    scheduled_date: string
    scheduled_end_date: string | null
    status: string
    title: string | null
    notes: string | null
    location_address: string | null
    customer_id: string | null
    technician_id: string | null
    service_order_id: string | null
    reminder_sent_at?: string | null
    customers?: One<{ name: string | null; phone: string | null }>
    technicians?: One<{ name: string | null }>
    service_orders?: One<{ id: string; title: string | null; order_number: string | number | null }>
}

const one = <T,>(v: One<T>) => (Array.isArray(v) ? v[0] ?? null : v ?? null)

const STATUS: Record<string, { label: string; tone: string; dot: string }> = {
    scheduled: { label: 'A confirmar', tone: 'bg-foreground/[0.06] text-muted-foreground', dot: 'bg-sky-500' },
    confirmed: { label: 'Confirmado', tone: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
    in_progress: { label: 'Em atendimento', tone: 'bg-amber-500/15 text-amber-800 dark:text-amber-400', dot: 'bg-amber-500' },
    completed: { label: 'Concluído', tone: 'bg-foreground/[0.06] text-muted-foreground', dot: 'bg-foreground/30' },
    cancelled: { label: 'Cancelado', tone: 'bg-red-500/10 text-red-700 dark:text-red-400', dot: 'bg-red-500' },
    rescheduled: { label: 'Remarcado', tone: 'bg-foreground/[0.06] text-muted-foreground', dot: 'bg-foreground/30' },
}
const statusOf = (s: string) => STATUS[s] ?? STATUS.scheduled

const pad = (n: number) => String(n).padStart(2, '0')
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const fromKey = (k: string) => new Date(`${k}T12:00:00`)
const addDays = (k: string, n: number) => { const d = fromKey(k); d.setDate(d.getDate() + n); return dayKey(d) }
const startOfWeek = (k: string) => { const d = fromKey(k); return addDays(k, -((d.getDay() + 6) % 7)) } // Monday
const time = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
const minutes = (a: Appointment) => a.scheduled_end_date ? Math.round((+new Date(a.scheduled_end_date) - +new Date(a.scheduled_date)) / 60000) : null
const durationLabel = (m: number | null) => !m || m <= 0 ? null : m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)} h ${m % 60}` : `${m / 60} h`
const active = (a: Appointment) => a.status !== 'cancelled' && a.status !== 'rescheduled'

export default function AgendaClient({ initial, technicians, customers, serviceOrders, autoReminder, whatsappReady, canEditSettings }: {
    initial: Appointment[]
    technicians: { id: string; name: string }[]
    customers: { id: string; name: string }[]
    serviceOrders: { id: string; title: string | null; order_number: string | number | null }[]
    autoReminder: boolean
    whatsappReady: boolean
    canEditSettings: boolean
}) {
    const router = useRouter()
    const today = dayKey(new Date())
    const [items, setItems] = useState(initial)
    const [day, setDay] = useState(today)
    const [who, setWho] = useState<string>('all')
    const [open, setOpen] = useState<Appointment | null>(null)
    const [form, setForm] = useState<{ appointment?: Appointment; date?: Date } | null>(null)
    const [settings, setSettings] = useState(false)

    useEffect(() => { setItems(initial) }, [initial])

    const visible = useMemo(() => items.filter(a => who === 'all' || (who === 'none' ? !a.technician_id : a.technician_id === who)), [items, who])
    const byDay = useMemo(() => {
        const m = new Map<string, Appointment[]>()
        for (const a of visible) {
            const k = dayKey(new Date(a.scheduled_date))
            m.set(k, [...(m.get(k) ?? []), a])
        }
        for (const list of m.values()) list.sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
        return m
    }, [visible])

    const week = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(day), i))
    const list = byDay.get(day) ?? []
    const pending = list.filter(a => a.status === 'scheduled').length
    const upcoming = useMemo(() => visible
        .filter(a => active(a) && a.status !== 'completed' && dayKey(new Date(a.scheduled_date)) > day)
        .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
        .slice(0, 5), [visible, day])

    const replace = (a: Partial<Appointment> & { id: string }) => {
        setItems(l => l.map(x => x.id === a.id ? { ...x, ...a } : x))
        setOpen(o => (o?.id === a.id ? { ...o, ...a } : o))
    }
    const removed = (id: string) => { setItems(l => l.filter(x => x.id !== id)); setOpen(null) }

    const monthLabel = fromKey(day).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    const dayLabel = day === today ? 'Hoje' : day === addDays(today, 1) ? 'Amanhã' : fromKey(day).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

    return (
        <div className="min-h-full bg-background">
            <Header title="Agenda" />
            <div className="max-w-3xl mx-auto px-4 lg:px-8 pt-4 pb-16 space-y-4">
                <div className="flex items-center gap-1">
                    <h2 className="type-title3 capitalize flex-1 min-w-0 truncate">{monthLabel}</h2>
                    {day !== today && (
                        <button type="button" onClick={() => setDay(today)} className="h-9 px-3 rounded-full text-[15px] font-medium text-primary hover:bg-primary/10 transition-colors">Hoje</button>
                    )}
                    <button type="button" onClick={() => setDay(addDays(day, -7))} aria-label="Semana anterior" className="w-10 h-10 rounded-full flex items-center justify-center text-primary hover:bg-foreground/[0.05] transition-colors">
                        <ChevronLeft aria-hidden className="w-5 h-5" />
                    </button>
                    <button type="button" onClick={() => setDay(addDays(day, 7))} aria-label="Próxima semana" className="w-10 h-10 rounded-full flex items-center justify-center text-primary hover:bg-foreground/[0.05] transition-colors">
                        <ChevronRight aria-hidden className="w-5 h-5" />
                    </button>
                    <button type="button" onClick={() => setSettings(true)} aria-label="Ajustes da agenda" className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-foreground/[0.05] transition-colors">
                        <Settings2 aria-hidden className="w-5 h-5" />
                    </button>
                </div>

                <div className="grid grid-cols-7 gap-1" role="tablist" aria-label="Dias da semana">
                    {week.map(k => {
                        const d = fromKey(k)
                        const count = (byDay.get(k) ?? []).filter(active).length
                        const selected = k === day
                        return (
                            <button
                                key={k}
                                type="button"
                                role="tab"
                                aria-selected={selected}
                                aria-label={`${d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric' })}${count ? `, ${count} agendamento${count > 1 ? 's' : ''}` : ''}`}
                                onClick={() => setDay(k)}
                                className={cn('flex flex-col items-center gap-0.5 py-2 rounded-2xl transition-colors', selected ? 'bg-primary text-primary-foreground' : 'hover:bg-foreground/[0.05]')}
                            >
                                <span className={cn('text-[11px] font-medium uppercase', selected ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                                <span className={cn('text-[19px] font-semibold tabular-nums', !selected && k === today && 'text-primary')}>{d.getDate()}</span>
                                <span className={cn('h-1.5 w-1.5 rounded-full', count ? (selected ? 'bg-primary-foreground' : 'bg-primary') : 'bg-transparent')} aria-hidden />
                            </button>
                        )
                    })}
                </div>

                {technicians.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
                        {[{ id: 'all', name: 'Todos' }, ...technicians, { id: 'none', name: 'Sem técnico' }].map(t => (
                            <button key={t.id} type="button" onClick={() => setWho(t.id)} className={cn('shrink-0 h-9 px-3.5 rounded-full text-[15px] font-medium transition-colors', who === t.id ? 'bg-primary text-primary-foreground' : 'bg-foreground/[0.06] hover:bg-foreground/[0.1]')}>
                                {t.name}
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex items-end justify-between gap-3 px-1 pt-1">
                    <div className="min-w-0">
                        <h3 className="text-[20px] font-semibold capitalize truncate">{dayLabel}</h3>
                        <p className="text-[13px] text-muted-foreground">
                            {list.filter(active).length ? `${list.filter(active).length} agendamento${list.filter(active).length > 1 ? 's' : ''}${pending ? ` · ${pending} a confirmar` : ''}` : 'Nada marcado'}
                        </p>
                    </div>
                    <PrimaryButton className="h-10 px-4 text-[15px]" onClick={() => setForm({ date: fromKey(day) })}><Plus aria-hidden className="w-5 h-5" /> Agendar</PrimaryButton>
                </div>

                {list.length ? (
                    <ul className="space-y-2">
                        {list.map(a => <AppointmentRow key={a.id} a={a} onOpen={() => setOpen(a)} />)}
                    </ul>
                ) : (
                    <button type="button" onClick={() => setForm({ date: fromKey(day) })} className="w-full py-10 rounded-2xl border border-dashed border-border text-[15px] text-muted-foreground hover:bg-foreground/[0.02] transition-colors">
                        Toque para agendar neste dia
                    </button>
                )}

                {upcoming.length > 0 && (
                    <Group title="Próximos">
                        {upcoming.map(a => {
                            const c = one(a.customers)
                            return (
                                <button key={a.id} type="button" onClick={() => { setDay(dayKey(new Date(a.scheduled_date))); setOpen(a) }} className="w-full flex items-center gap-3 px-4 py-2.5 min-h-[52px] text-left hover:bg-foreground/[0.02] transition-colors">
                                    <span className={cn('w-2 h-2 rounded-full shrink-0', statusOf(a.status).dot)} aria-hidden />
                                    <span className="flex-1 min-w-0">
                                        <span className="block text-[15px] truncate">{c?.name ?? 'Sem cliente'}{a.title ? ` · ${a.title}` : ''}</span>
                                        <span className="block text-[12px] text-muted-foreground capitalize">{new Date(a.scheduled_date).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })} · {time(a.scheduled_date)}</span>
                                    </span>
                                    <ChevronRight aria-hidden className="w-4 h-4 text-muted-foreground/70 shrink-0" />
                                </button>
                            )
                        })}
                    </Group>
                )}
            </div>

            <AppointmentSheet
                a={open}
                onClose={() => setOpen(null)}
                onChange={replace}
                onRemoved={removed}
                onEdit={a => { setOpen(null); setForm({ appointment: a }) }}
                whatsappReady={whatsappReady}
            />

            <Sheet open={!!form} onClose={() => setForm(null)} title={form?.appointment ? 'Editar agendamento' : 'Novo agendamento'} size="lg" full>
                {form && (
                    <AppointmentForm
                        onClose={() => setForm(null)}
                        onSuccess={() => router.refresh()}
                        customers={customers}
                        technicians={technicians}
                        serviceOrders={serviceOrders.map(o => ({ id: o.id, title: o.title ?? undefined, order_number: o.order_number ?? undefined }))}
                        appointment={form.appointment}
                        initialDate={form.date}
                    />
                )}
            </Sheet>

            <SettingsSheet open={settings} onClose={() => setSettings(false)} initial={autoReminder} whatsappReady={whatsappReady} canEdit={canEditSettings} />
        </div>
    )
}

function AppointmentRow({ a, onOpen }: { a: Appointment; onOpen: () => void }) {
    const c = one(a.customers)
    const t = one(a.technicians)
    const os = one(a.service_orders)
    const s = statusOf(a.status)
    const dur = durationLabel(minutes(a))
    return (
        <li>
            <button type="button" onClick={onOpen} className={cn('w-full flex gap-3 p-3 rounded-2xl bg-card border border-border/60 text-left hover:bg-foreground/[0.02] active:bg-foreground/[0.04] transition-colors', !active(a) && 'opacity-60')}>
                <span className="w-14 shrink-0 text-center">
                    <span className="block text-[17px] font-semibold tabular-nums">{time(a.scheduled_date)}</span>
                    {dur && <span className="block text-[12px] text-muted-foreground">{dur}</span>}
                </span>
                <span className={cn('w-1 self-stretch rounded-full shrink-0', s.dot)} aria-hidden />
                <span className="flex-1 min-w-0">
                    <span className={cn('block text-[16px] font-medium truncate', a.status === 'cancelled' && 'line-through')}>{c?.name ?? 'Sem cliente'}</span>
                    <span className="block text-[13px] text-muted-foreground truncate">
                        {[a.title, os ? `OS #${os.order_number}` : null, t?.name].filter(Boolean).join(' · ') || 'Sem detalhes'}
                    </span>
                    {a.location_address && <span className="flex items-center gap-1 text-[12px] text-muted-foreground truncate"><MapPin aria-hidden className="w-3 h-3 shrink-0" /> {a.location_address}</span>}
                </span>
                <span className={cn('self-start shrink-0 px-2 h-6 rounded-full text-[12px] font-semibold inline-flex items-center', s.tone)}>{s.label}</span>
            </button>
        </li>
    )
}

function AppointmentSheet({ a, onClose, onChange, onRemoved, onEdit, whatsappReady }: {
    a: Appointment | null
    onClose: () => void
    onChange: (a: Partial<Appointment> & { id: string }) => void
    onRemoved: (id: string) => void
    onEdit: (a: Appointment) => void
    whatsappReady: boolean
}) {
    const [busy, setBusy] = useState<string | null>(null)
    const [confirm, setConfirm] = useState<'cancel' | 'delete' | null>(null)
    if (!a) return null
    const c = one(a.customers)
    const t = one(a.technicians)
    const os = one(a.service_orders)
    const s = statusOf(a.status)
    const phone = (c?.phone ?? '').replace(/\D/g, '')
    const dur = durationLabel(minutes(a))

    const setStatus = async (status: string) => {
        setBusy(status)
        try {
            const res = await fetch('/api/appointments', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: a.id, status }) })
            if (!res.ok) throw new Error()
            onChange({ id: a.id, status })
            toast.success(statusOf(status).label)
        } catch {
            toast.error('Não foi possível atualizar. Tente de novo.')
        } finally {
            setBusy(null)
        }
    }

    const remind = async () => {
        setBusy('remind')
        try {
            const res = await fetch(`/api/appointments/${a.id}/remind`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ force: !!a.reminder_sent_at }) })
            const d = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(typeof d.error === 'string' ? d.error : 'Não foi possível enviar.')
            if (d.url) window.open(d.url, '_blank', 'noopener')
            else {
                toast.success(d.duplicate ? 'O lembrete já tinha sido enviado' : 'Lembrete enviado no WhatsApp')
                onChange({ id: a.id, reminder_sent_at: new Date().toISOString() })
            }
        } catch (err) {
            toast.error((err as Error).message)
        } finally {
            setBusy(null)
        }
    }

    const remove = async () => {
        setConfirm(null)
        const res = await fetch(`/api/appointments?id=${a.id}`, { method: 'DELETE' })
        if (res.ok) { toast.success('Agendamento excluído'); onRemoved(a.id) }
        else toast.error('Não foi possível excluir. Tente de novo.')
    }

    const next = a.status === 'scheduled' ? { status: 'confirmed', label: 'Confirmar', icon: Check }
        : a.status === 'confirmed' ? { status: 'in_progress', label: 'Iniciar atendimento', icon: Play }
        : a.status === 'in_progress' ? { status: 'completed', label: 'Concluir', icon: Check }
        : null

    return (
        <>
            <Sheet
                open
                onClose={onClose}
                title={c?.name ?? 'Agendamento'}
                subtitle={a.title ?? undefined}
                size="lg"
                footer={next ? (
                    <PrimaryButton className="flex-1" onClick={() => setStatus(next.status)} disabled={!!busy}>
                        {busy === next.status ? <Loader2 aria-hidden className="w-5 h-5 animate-spin" /> : <next.icon aria-hidden className="w-5 h-5" />} {next.label}
                    </PrimaryButton>
                ) : undefined}
            >
                <div className="space-y-5">
                    <Group>
                        <Info label="Quando" value={`${new Date(a.scheduled_date).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })} · ${time(a.scheduled_date)}${dur ? ` · ${dur}` : ''}`} />
                        <Info label="Situação" value={<span className={cn('px-2 h-6 rounded-full text-[13px] font-semibold inline-flex items-center', s.tone)}>{s.label}</span>} />
                        <Info label="Técnico" value={t?.name ?? 'Nenhum'} />
                        {a.location_address && (
                            <a href={`https://maps.google.com/?q=${encodeURIComponent(a.location_address)}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 min-h-[48px] hover:bg-foreground/[0.02] transition-colors">
                                <span className="text-[17px] shrink-0">Endereço</span>
                                <span className="ml-auto text-[17px] text-primary truncate">{a.location_address}</span>
                            </a>
                        )}
                        {os && (
                            <Link href={`/service-orders/${os.id}`} className="flex items-center gap-3 px-4 min-h-[48px] hover:bg-foreground/[0.02] transition-colors">
                                <ClipboardList aria-hidden className="w-4 h-4 text-muted-foreground shrink-0" />
                                <span className="flex-1 min-w-0 text-[17px] text-primary truncate">OS #{os.order_number} {os.title}</span>
                                <ChevronRight aria-hidden className="w-4 h-4 text-muted-foreground/70 shrink-0" />
                            </Link>
                        )}
                        {a.notes && <p className="px-4 py-3 text-[15px] text-muted-foreground whitespace-pre-wrap break-words">{a.notes}</p>}
                    </Group>

                    <Group title="Cliente" footer={a.reminder_sent_at ? `Lembrete enviado em ${new Date(a.reminder_sent_at).toLocaleString('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.` : !whatsappReady ? 'Sem o WhatsApp da loja conectado, o lembrete abre no seu WhatsApp para você enviar.' : undefined}>
                        <div className="grid grid-cols-2 gap-2 p-3">
                            <SecondaryButton onClick={remind} disabled={!phone || busy === 'remind'} className="text-[15px]">
                                {busy === 'remind' ? <Loader2 aria-hidden className="w-5 h-5 animate-spin" /> : a.reminder_sent_at ? <Bell aria-hidden className="w-5 h-5" /> : <MessageCircle aria-hidden className="w-5 h-5" />}
                                {a.reminder_sent_at ? 'Lembrar de novo' : 'Enviar lembrete'}
                            </SecondaryButton>
                            {phone ? (
                                <a href={`tel:${phone}`} className="h-12 px-5 rounded-full bg-foreground/[0.07] text-foreground text-[15px] font-medium inline-flex items-center justify-center gap-1.5 hover:bg-foreground/[0.1] transition-colors">
                                    <Phone aria-hidden className="w-5 h-5" /> Ligar
                                </a>
                            ) : <SecondaryButton disabled className="text-[15px]"><Phone aria-hidden className="w-5 h-5" /> Sem telefone</SecondaryButton>}
                        </div>
                    </Group>

                    <div className="flex gap-2">
                        <SecondaryButton onClick={() => setConfirm('delete')} className="text-red-600 dark:text-red-400" aria-label="Excluir agendamento"><Trash2 aria-hidden className="w-5 h-5" /></SecondaryButton>
                        {active(a) && a.status !== 'completed' && (
                            <SecondaryButton onClick={() => setConfirm('cancel')} className="text-red-600 dark:text-red-400"><X aria-hidden className="w-5 h-5" /> Cancelar</SecondaryButton>
                        )}
                        <SecondaryButton className="flex-1" onClick={() => onEdit(a)}><Pencil aria-hidden className="w-5 h-5" /> Editar ou remarcar</SecondaryButton>
                    </div>
                </div>
            </Sheet>
            <PremiumConfirmDialog
                isOpen={confirm === 'cancel'}
                title="Cancelar agendamento?"
                description="Ele continua na agenda, marcado como cancelado."
                confirmLabel="Cancelar agendamento"
                cancelLabel="Voltar"
                onConfirm={() => { setConfirm(null); setStatus('cancelled') }}
                onCancel={() => setConfirm(null)}
            />
            <PremiumConfirmDialog
                isOpen={confirm === 'delete'}
                title="Excluir agendamento?"
                description="Ele sai da agenda. Essa ação não pode ser desfeita."
                confirmLabel="Excluir"
                cancelLabel="Manter"
                onConfirm={remove}
                onCancel={() => setConfirm(null)}
            />
        </>
    )
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 px-4 min-h-[48px]">
            <span className="text-[17px] shrink-0">{label}</span>
            <span className="ml-auto text-[17px] text-muted-foreground text-right truncate">{value}</span>
        </div>
    )
}

function SettingsSheet({ open, onClose, initial, whatsappReady, canEdit }: { open: boolean; onClose: () => void; initial: boolean; whatsappReady: boolean; canEdit: boolean }) {
    const [on, setOn] = useState(initial)
    const [saving, setSaving] = useState(false)
    const toggle = async (v: boolean) => {
        setOn(v)
        setSaving(true)
        try {
            const res = await fetch('/api/customers/automations', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appointment_reminder: v }) })
            if (!res.ok) throw new Error()
            toast.success(v ? 'Lembrete automático ligado' : 'Lembrete automático desligado')
        } catch {
            setOn(!v)
            toast.error('Não foi possível salvar. Tente de novo.')
        } finally {
            setSaving(false)
        }
    }
    return (
        <Sheet open={open} onClose={onClose} title="Ajustes da agenda">
            <Group footer={
                !whatsappReady ? 'Precisa do WhatsApp da loja conectado (Alice → WhatsApp). Sem ele, envie o lembrete pelo botão em cada agendamento.'
                    : !canEdit ? 'Só o dono pode mudar este ajuste.'
                    : 'Vai de manhã, pelo WhatsApp da loja, para quem tem horário no dia seguinte e ainda não foi cancelado.'
            }>
                <SwitchRow label="Lembrete automático na véspera" description={saving ? 'Salvando…' : undefined} checked={on} onChange={v => { if (canEdit) void toggle(v) }} />
            </Group>
        </Sheet>
    )
}
