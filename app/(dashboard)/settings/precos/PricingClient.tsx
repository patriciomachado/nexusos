'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { BottomBar, Chips, Field, Group, PrimaryButton, SecondaryButton, TextInput, brl, parseMoney, moneyText } from '@/components/ui/form'
import Sheet from '@/components/tasks/Sheet'
import PremiumConfirmDialog from '@/components/ui/PremiumConfirmDialog'
import { hourCost, marginAt, marginTone, normalizePricing, quote, type PricingData, type ServiceRow } from '@/lib/pricing'
import { cn } from '@/lib/utils'

const num = (t: string) => parseMoney(t)
const pctText = (n: number) => String(n).replace('.', ',')
const TIMES = [
    { value: '15', label: '15 min' },
    { value: '30', label: '30 min' },
    { value: '60', label: '1 h' },
    { value: '90', label: '1 h 30' },
    { value: '120', label: '2 h' },
    { value: '240', label: '4 h' },
]
const minutesLabel = (m: number | null) => m == null ? '—' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60}` : ''}`

/**
 * Owner's pricing settings: what an hour of bench work costs the store, the
 * margin and taxes on top, and the table of standard services and prices.
 */
export default function PricingClient({ initial }: { initial: PricingData }) {
    const [data, setData] = useState(initial)
    const s0 = initial.settings
    const [source, setSource] = useState<'contas' | 'manual'>(s0.fixed_costs == null ? 'contas' : 'manual')
    const [fixed, setFixed] = useState(moneyText(s0.fixed_costs ?? 0))
    const [extra, setExtra] = useState(moneyText(s0.extra_costs))
    const [hours, setHours] = useState(String(s0.hours_per_month))
    const [productive, setProductive] = useState(pctText(s0.productive_pct))
    const [margin, setMargin] = useState(pctText(s0.margin_pct))
    const [tax, setTax] = useState(pctText(s0.tax_pct))
    const [saving, setSaving] = useState(false)
    const [editing, setEditing] = useState<ServiceRow | 'new' | null>(null)

    const settings = useMemo(() => normalizePricing({
        fixed_costs: source === 'contas' ? null : num(fixed),
        extra_costs: num(extra),
        hours_per_month: num(hours),
        productive_pct: num(productive),
        margin_pct: num(margin),
        tax_pct: num(tax),
    }), [source, fixed, extra, hours, productive, margin, tax])
    const perHour = hourCost(settings, data.bills.total)
    const monthly = (settings.fixed_costs ?? data.bills.total) + settings.extra_costs
    const dirty = JSON.stringify(settings) !== JSON.stringify(data.settings)

    const save = async () => {
        setSaving(true)
        try {
            const res = await fetch('/api/pricing', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) })
            if (!res.ok) throw new Error()
            setData(await res.json())
            toast.success('Preços salvos')
        } catch {
            toast.error('Não foi possível salvar. Confira a conexão e tente de novo.')
        } finally {
            setSaving(false)
        }
    }

    const reloadServices = async () => {
        const res = await fetch('/api/pricing')
        if (res.ok) {
            const fresh: PricingData = await res.json()
            setData(d => ({ ...d, services: fresh.services }))
        }
    }

    return (
        <div className="space-y-6">
            <div className="rounded-2xl bg-card border border-border/60 p-5 text-center">
                <p className="text-[13px] text-muted-foreground">Cada hora de bancada custa para a loja</p>
                <p className="text-[34px] font-bold tabular-nums tracking-tight">{brl(perHour)}</p>
                <p className="text-[13px] text-muted-foreground text-pretty">
                    {brl(monthly)} de custos no mês ÷ {Math.round(settings.hours_per_month * settings.productive_pct / 100)} h de conserto
                </p>
            </div>

            <Group title="Custos fixos do mês" footer="Aluguel, luz, internet, contador, sistema… Tudo que a loja paga mesmo sem vender nada.">
                <div className="p-3">
                    <Chips ariaLabel="De onde vêm os custos" value={source} onChange={setSource} options={[{ value: 'contas', label: 'Das Contas' }, { value: 'manual', label: 'Digitar valor' }]} />
                </div>
                {source === 'contas' ? (
                    <Link href="/contas" className="flex items-center gap-3 px-4 py-3 min-h-[52px] hover:bg-foreground/[0.02]">
                        <span className="flex-1 min-w-0">
                            <span className="block text-[17px]">Contas que repetem todo mês</span>
                            <span className="block text-[13px] text-muted-foreground">
                                {data.bills.count ? `${data.bills.count} conta${data.bills.count > 1 ? 's' : ''}` : 'Nenhuma conta mensal cadastrada'}
                            </span>
                        </span>
                        <span className="text-[17px] tabular-nums">{brl(data.bills.total)}</span>
                        <ChevronRight aria-hidden className="w-4 h-4 text-muted-foreground/60" />
                    </Link>
                ) : (
                    <Field label="Custos fixos por mês (R$)" htmlFor="pr-fixed">
                        <TextInput id="pr-fixed" inputMode="decimal" value={fixed} onChange={e => setFixed(e.target.value)} placeholder="0,00" />
                    </Field>
                )}
                <Field label="Retirada do dono e salários (R$)" htmlFor="pr-extra" hint="Some aqui o que não está lançado nas Contas.">
                    <TextInput id="pr-extra" inputMode="decimal" value={extra} onChange={e => setExtra(e.target.value)} placeholder="0,00" />
                </Field>
            </Group>

            <Group title="Horas de trabalho" footer="Parte do dia vai para atender, comprar peça e organizar. Só as horas de conserto pagam os custos.">
                <div className="grid grid-cols-2 divide-x divide-border/60">
                    <Field label="Horas por mês" htmlFor="pr-hours">
                        <TextInput id="pr-hours" inputMode="numeric" value={hours} onChange={e => setHours(e.target.value)} />
                    </Field>
                    <Field label="Em conserto (%)" htmlFor="pr-prod">
                        <TextInput id="pr-prod" inputMode="decimal" value={productive} onChange={e => setProductive(e.target.value)} />
                    </Field>
                </div>
            </Group>

            <Group title="Lucro e impostos">
                <div className="grid grid-cols-2 divide-x divide-border/60">
                    <Field label="Lucro desejado (%)" htmlFor="pr-margin">
                        <TextInput id="pr-margin" inputMode="decimal" value={margin} onChange={e => setMargin(e.target.value)} />
                    </Field>
                    <Field label="Impostos (%)" htmlFor="pr-tax" hint="Simples: 6% é comum">
                        <TextInput id="pr-tax" inputMode="decimal" value={tax} onChange={e => setTax(e.target.value)} />
                    </Field>
                </div>
            </Group>

            <Group title="Taxas da maquininha" footer="O preço no cartão já sai com a taxa somada, para você receber o mesmo que no Pix.">
                <Link href="/cash-register?ajustes=1" className="flex items-center gap-3 px-4 py-3 min-h-[52px] hover:bg-foreground/[0.02]">
                    <span className="flex-1 text-[17px]">Crédito à vista</span>
                    <span className="text-[17px] text-muted-foreground tabular-nums">{pctText(data.fees.credit)}%</span>
                    <ChevronRight aria-hidden className="w-4 h-4 text-muted-foreground/60" />
                </Link>
                <Link href="/cash-register?ajustes=1" className="flex items-center gap-3 px-4 py-3 min-h-[52px] hover:bg-foreground/[0.02]">
                    <span className="flex-1 text-[17px]">Crédito parcelado</span>
                    <span className="text-[17px] text-muted-foreground tabular-nums">{pctText(data.fees.installments)}%</span>
                    <ChevronRight aria-hidden className="w-4 h-4 text-muted-foreground/60" />
                </Link>
            </Group>

            <Group
                title="Tabela de serviços"
                action={<button type="button" onClick={() => setEditing('new')} className="inline-flex items-center gap-1 text-[15px] font-medium text-primary"><Plus aria-hidden className="w-4 h-4" /> Adicionar</button>}
                footer="Preço da mão de obra, sem as peças. O lucro mostrado já desconta o custo da hora e os impostos."
            >
                {data.services.length === 0 ? (
                    <p className="px-4 py-6 text-center text-[15px] text-muted-foreground">Cadastre os serviços que você mais faz, como troca de tela, bateria e conector.</p>
                ) : data.services.map(sv => {
                    const q = quote({ partsCost: 0, minutes: sv.minutes ?? 60, hourCost: perHour, marginPct: settings.margin_pct, taxPct: settings.tax_pct, fees: data.fees })
                    const m = marginAt(sv.price, q.cost, settings.tax_pct)
                    return (
                        <button key={sv.id} type="button" onClick={() => setEditing(sv)} className="w-full flex items-center gap-3 px-4 py-3 min-h-[60px] text-left hover:bg-foreground/[0.02]">
                            <span className="flex-1 min-w-0">
                                <span className="block text-[17px] truncate">{sv.name}</span>
                                <span className="block text-[13px] text-muted-foreground truncate">{minutesLabel(sv.minutes)} · sugerido {brl(q.suggested)}</span>
                            </span>
                            <span className="text-right shrink-0">
                                <span className="block text-[17px] tabular-nums">{sv.price ? brl(sv.price) : '—'}</span>
                                {sv.price > 0 && <span className={cn('block text-[13px] tabular-nums', marginTone(m, settings.margin_pct))}>lucro {Math.round((m ?? 0) * 100)}%</span>}
                            </span>
                            <ChevronRight aria-hidden className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                        </button>
                    )
                })}
            </Group>

            {dirty && (
                <BottomBar>
                    <PrimaryButton className="flex-1" onClick={save} disabled={saving}>
                        {saving && <Loader2 aria-hidden className="w-5 h-5 animate-spin" />}
                        Salvar
                    </PrimaryButton>
                </BottomBar>
            )}

            {editing && (
                <ServiceSheet
                    service={editing === 'new' ? null : editing}
                    perHour={perHour}
                    marginPct={settings.margin_pct}
                    taxPct={settings.tax_pct}
                    fees={data.fees}
                    onClose={() => setEditing(null)}
                    onSaved={() => { setEditing(null); reloadServices() }}
                />
            )}
        </div>
    )
}

function ServiceSheet({ service, perHour, marginPct, taxPct, fees, onClose, onSaved }: {
    service: ServiceRow | null
    perHour: number
    marginPct: number
    taxPct: number
    fees: PricingData['fees']
    onClose: () => void
    onSaved: () => void
}) {
    const [name, setName] = useState(service?.name ?? '')
    const [minutes, setMinutes] = useState(String(service?.minutes ?? 60))
    const [price, setPrice] = useState(moneyText(service?.price ?? 0))
    const [busy, setBusy] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)

    const q = quote({ partsCost: 0, minutes: num(minutes), hourCost: perHour, marginPct, taxPct, fees })
    const chosen = num(price)
    const m = marginAt(chosen, q.cost, taxPct)

    const submit = async () => {
        if (!name.trim()) { toast.error('Dê um nome ao serviço'); return }
        setBusy(true)
        try {
            const res = await fetch(service ? `/api/settings/service-types/${service.id}` : '/api/settings/service-types', {
                method: service ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim(), description: service?.description ?? null, base_price: chosen, estimated_time_minutes: Math.round(num(minutes)), is_active: true }),
            })
            if (!res.ok) throw new Error()
            toast.success(service ? 'Serviço atualizado' : 'Serviço adicionado')
            onSaved()
        } catch {
            toast.error('Não foi possível salvar o serviço. Tente de novo.')
        } finally {
            setBusy(false)
        }
    }

    const remove = async () => {
        if (!service) return
        setBusy(true)
        try {
            const res = await fetch(`/api/settings/service-types/${service.id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error()
            toast.success('Serviço removido')
            onSaved()
        } catch {
            toast.error('Não foi possível remover. Tente de novo.')
            setBusy(false)
        }
    }

    return (
        <Sheet
            open
            onClose={onClose}
            title={service ? 'Editar serviço' : 'Novo serviço'}
            footer={
                <div className="flex gap-2">
                    {service && <SecondaryButton onClick={() => setConfirmDelete(true)} disabled={busy} className="text-red-600 dark:text-red-400">Remover</SecondaryButton>}
                    <PrimaryButton className="flex-1" onClick={submit} disabled={busy}>
                        {busy && <Loader2 aria-hidden className="w-5 h-5 animate-spin" />}
                        Salvar
                    </PrimaryButton>
                </div>
            }
        >
            <div className="space-y-5">
                <Group>
                    <Field label="Serviço" htmlFor="sv-name">
                        <TextInput id="sv-name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Troca de conector de carga" />
                    </Field>
                    <Field label="Tempo de bancada (min)" htmlFor="sv-min">
                        <TextInput id="sv-min" inputMode="numeric" value={minutes} onChange={e => setMinutes(e.target.value)} />
                    </Field>
                    <div className="p-3">
                        <Chips ariaLabel="Tempo" options={TIMES} value={TIMES.some(t => t.value === minutes) ? minutes : ''} onChange={setMinutes} />
                    </div>
                </Group>

                <Group title="Quanto cobrar (mão de obra)">
                    <div className="grid grid-cols-2 divide-x divide-border/60 text-center">
                        <div className="px-3 py-3">
                            <p className="text-[13px] text-muted-foreground">Mínimo</p>
                            <p className="text-[20px] font-semibold tabular-nums">{brl(q.minimum)}</p>
                        </div>
                        <button type="button" onClick={() => setPrice(moneyText(q.suggested))} className="px-3 py-3 hover:bg-foreground/[0.03]">
                            <p className="text-[13px] text-muted-foreground">Sugerido</p>
                            <p className="text-[20px] font-semibold tabular-nums text-primary">{brl(q.suggested)}</p>
                        </button>
                    </div>
                    <Field label="Preço cobrado (R$)" htmlFor="sv-price" hint={chosen > 0 ? <span className={marginTone(m, marginPct)}>Lucro de {Math.round((m ?? 0) * 100)}% ({brl(chosen * (1 - taxPct / 100) - q.cost)})</span> : 'Toque em Sugerido para usar esse valor.'}>
                        <TextInput id="sv-price" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} placeholder="0,00" />
                    </Field>
                </Group>
            </div>
            <PremiumConfirmDialog
                isOpen={confirmDelete}
                title="Remover serviço?"
                description={`"${service?.name ?? ''}" sai da tabela. As OS antigas não mudam.`}
                confirmLabel="Remover"
                onConfirm={() => { setConfirmDelete(false); remove() }}
                onCancel={() => setConfirmDelete(false)}
            />
        </Sheet>
    )
}
