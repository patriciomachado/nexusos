'use client'

import { useEffect, useMemo, useState } from 'react'
import { Camera, Check, X } from 'lucide-react'
import Segmented from '@/components/ui/Segmented'
import { cn, getLocalDateTimePickerValue } from '@/lib/utils'
import CustomerPicker from './CustomerPicker'
import DeviceLockInput from './DeviceLockInput'
import ItemsEditor from './ItemsEditor'
import { brl, Chips, Field, Group, moneyText, parseMoney, SelectRow, SwitchRow, TextArea, TextInput } from '@/components/ui/form'
import { DEVICE_TYPES, PRIORITY_OPTIONS, STATUS_OPTIONS, type InventoryOption, type OSFormState, type Option, type SideKey } from './state'

/* ─── Cliente ──────────────────────────────────────────────────────────── */

export function ClientSection({ state, customers, onCustomersChange, technicians, companyId, invalid, showStatus = true, compact = false }: {
    state: OSFormState
    customers: Option[]
    onCustomersChange: (list: Option[]) => void
    technicians: Option[]
    companyId: string
    invalid?: boolean
    showStatus?: boolean
    compact?: boolean
}) {
    const { values: v, set } = state
    return (
        <div className="space-y-6">
            <Group footer={invalid ? <span className="text-red-600 dark:text-red-400">Escolha o cliente para continuar.</span> : undefined}>
                <CustomerPicker customers={customers} onCustomersChange={onCustomersChange} value={v.customer_id} onChange={id => set('customer_id', id)} companyId={companyId} invalid={invalid} />
            </Group>
            {!compact && (
                <>
                    <Group title="Atendimento">
                        <SelectRow id="os-technician" label="Técnico" value={v.technician_id} onChange={id => set('technician_id', id)} options={technicians.map(t => ({ value: t.id, label: t.name }))} placeholder="Nenhum" />
                        {showStatus && <SelectRow id="os-status" label="Situação" value={v.status} onChange={s => set('status', s || 'aberta')} options={STATUS_OPTIONS} />}
                    </Group>
                    <Group title="Prioridade">
                        <div className="px-3 py-3">
                            <Segmented
                                value={v.priority as (typeof PRIORITY_OPTIONS)[number]['value']}
                                onChange={p => set('priority', p)}
                                ariaLabel="Prioridade"
                                className="w-full [&>button]:flex-1"
                                options={PRIORITY_OPTIONS.map(p => ({ value: p.value, label: p.label }))}
                            />
                        </div>
                    </Group>
                </>
            )}
        </div>
    )
}

/* ─── Aparelho ─────────────────────────────────────────────────────────── */

export function DeviceSection({ state, invalid, compact = false }: { state: OSFormState; invalid?: boolean; compact?: boolean }) {
    const { values: v, set } = state
    const preset = DEVICE_TYPES.find(t => t.toLowerCase() === v.title.trim().toLowerCase()) ?? ''
    return (
        <div className="space-y-6">
            <Group title="Tipo de aparelho" footer={invalid ? <span className="text-red-600 dark:text-red-400">Informe o tipo de aparelho.</span> : undefined}>
                <div className="px-4 pt-3 pb-1">
                    <Chips options={DEVICE_TYPES.map(t => ({ value: t, label: t }))} value={preset} onChange={t => set('title', t)} ariaLabel="Tipo de aparelho" />
                </div>
                <Field label="Ou digite" htmlFor="os-type">
                    <TextInput id="os-type" value={v.title} onChange={e => set('title', e.target.value)} placeholder="Ex.: Caixa de som" autoCapitalize="sentences" aria-invalid={invalid || undefined} />
                </Field>
            </Group>
            <Group title="Identificação">
                <Field label="Marca e modelo" htmlFor="os-model">
                    <TextInput id="os-model" value={v.equipment_description} onChange={e => set('equipment_description', e.target.value)} placeholder="Ex.: iPhone 13 Pro, Galaxy A54" />
                </Field>
                {!compact && (
                    <Field label="Nº de série ou IMEI" htmlFor="os-serial">
                        <TextInput id="os-serial" value={v.equipment_serial} onChange={e => set('equipment_serial', e.target.value)} placeholder="Opcional" autoCapitalize="characters" autoCorrect="off" spellCheck={false} />
                    </Field>
                )}
            </Group>
            {!compact && (
                <Group title="O aparelho liga?">
                    <div className="px-3 py-3">
                        <Segmented<'sim' | 'nao'>
                            value={v.turns_on ? 'sim' : 'nao'}
                            onChange={x => set('turns_on', x === 'sim')}
                            ariaLabel="O aparelho liga?"
                            className="w-full [&>button]:flex-1"
                            options={[{ value: 'sim', label: 'Liga' }, { value: 'nao', label: 'Não liga' }]}
                        />
                    </div>
                </Group>
            )}
        </div>
    )
}

/* ─── Problema, estado e fotos ─────────────────────────────────────────── */

function PhotoTile({ label, file, url, onPick, onClear }: { label: string; file: File | null; url: string; onPick: (f: File | null) => void; onClear: () => void }) {
    const preview = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file])
    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
    const src = preview || url
    return (
        <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-foreground/[0.05]">
            {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img width={400} height={400} loading="lazy" src={src} alt={label} className="w-full h-full object-cover" />
            ) : (
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground">
                    <Camera className="w-6 h-6" />
                    <span className="text-[13px] font-medium">{label}</span>
                </span>
            )}
            <input
                type="file"
                accept="image/*"
                capture="environment"
                aria-label={`${src ? 'Trocar' : 'Tirar'} foto: ${label}`}
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={e => onPick(e.target.files?.[0] ?? null)}
            />
            {src && (
                <>
                    <span className="absolute left-2 bottom-2 px-2 py-0.5 rounded-full bg-black/55 text-white text-[12px] font-medium pointer-events-none">{label}</span>
                    <button type="button" onClick={onClear} aria-label={`Remover foto: ${label}`} className="absolute right-1.5 top-1.5 w-8 h-8 rounded-full bg-black/55 text-white flex items-center justify-center">
                        <X className="w-4 h-4" />
                    </button>
                </>
            )}
        </div>
    )
}

export function ProblemSection({ state, compact = false }: { state: OSFormState; compact?: boolean }) {
    const { values: v, set, photos, setPhotos, photoUrls, setPhotoUrls } = state
    const done = v.checklist.filter(c => c.completed).length
    const toggle = (id: string) => set('checklist', v.checklist.map(c => c.id === id ? { ...c, completed: !c.completed } : c))
    const allOn = done === v.checklist.length

    const pick = (side: SideKey) => (f: File | null) => setPhotos(p => ({ ...p, [side]: f }))
    const clear = (side: SideKey) => () => { setPhotos(p => ({ ...p, [side]: null })); setPhotoUrls(u => ({ ...u, [side]: '' })) }

    return (
        <div className="space-y-6">
            <Group title="O que o cliente relatou">
                <Field label="Defeito" htmlFor="os-problem">
                    <TextArea id="os-problem" value={v.problem_description} onChange={e => set('problem_description', e.target.value)} placeholder="Ex.: Tela quebrada e touch falhando" rows={3} />
                </Field>
            </Group>

            {!compact && (
                <>
                    <Group title="Estado na entrada">
                        <Field label="Marcas, riscos e avarias" htmlFor="os-condition">
                            <TextArea id="os-condition" value={v.device_condition} onChange={e => set('device_condition', e.target.value)} placeholder="Ex.: Riscos na traseira, canto amassado" rows={2} />
                        </Field>
                        <div className="p-3 grid grid-cols-2 gap-3">
                            <PhotoTile label="Frente" file={photos.front} url={photoUrls.front} onPick={pick('front')} onClear={clear('front')} />
                            <PhotoTile label="Traseira" file={photos.back} url={photoUrls.back} onPick={pick('back')} onClear={clear('back')} />
                        </div>
                    </Group>

                    <Group
                        title={`Testes na entrada · ${done} de ${v.checklist.length}`}
                        action={
                            <button type="button" onClick={() => set('checklist', v.checklist.map(c => ({ ...c, completed: !allOn })))} className="text-[15px] font-medium text-primary">
                                {allOn ? 'Desmarcar' : 'Tudo ok'}
                            </button>
                        }
                        footer="Marque o que foi testado e está funcionando."
                    >
                        <div className="p-3 grid grid-cols-2 gap-2">
                            {v.checklist.map(c => (
                                <button
                                    key={c.id}
                                    type="button"
                                    role="checkbox"
                                    aria-checked={c.completed}
                                    onClick={() => toggle(c.id)}
                                    className={cn(
                                        'min-h-[44px] px-3 py-2 rounded-xl text-left text-[15px] leading-tight flex items-center gap-2 transition-colors',
                                        c.completed ? 'bg-emerald-500/12 text-emerald-800 dark:text-emerald-300' : 'bg-foreground/[0.05] text-foreground'
                                    )}
                                >
                                    <span className={cn('w-5 h-5 rounded-full shrink-0 flex items-center justify-center', c.completed ? 'bg-emerald-500 text-white' : 'border-2 border-foreground/20')}>
                                        {c.completed && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                                    </span>
                                    <span className="min-w-0">{c.text}</span>
                                </button>
                            ))}
                        </div>
                    </Group>

                    <Group title="Para a equipe" footer="O laudo aparece na OS do cliente; a observação interna, não.">
                        <Field label="Laudo técnico inicial" htmlFor="os-report">
                            <TextArea id="os-report" value={v.description} onChange={e => set('description', e.target.value)} placeholder="Opcional" rows={2} />
                        </Field>
                        <Field label="Observação interna" htmlFor="os-notes">
                            <TextArea id="os-notes" value={v.notes} onChange={e => set('notes', e.target.value)} placeholder="Opcional" rows={2} />
                        </Field>
                    </Group>
                </>
            )}
        </div>
    )
}

/* ─── Senha ────────────────────────────────────────────────────────────── */

export function LockSection({ state }: { state: OSFormState }) {
    return <DeviceLockInput value={state.values.lock} onChange={lock => state.set('lock', lock)} />
}

/** Keeps what the person typed ("12,5") while the form stores the number. */
function MoneyInput({ id, value, onChange }: { id: string; value: number; onChange: (n: number) => void }) {
    const [text, setText] = useState(() => moneyText(value))
    return (
        <TextInput
            id={id}
            inputMode="decimal"
            value={text}
            onChange={e => { setText(e.target.value); onChange(parseMoney(e.target.value)) }}
            placeholder="0,00"
            className="text-right tabular-nums"
        />
    )
}

/* ─── Orçamento ────────────────────────────────────────────────────────── */

export function BudgetSection({ state, inventory }: { state: OSFormState; inventory: InventoryOption[] }) {
    const { values: v, set, items, setItems, totals } = state
    return (
        <div className="space-y-6">
            <section className="space-y-1.5">
                <h3 className="px-4 text-[13px] font-medium text-muted-foreground">Peças e serviços</h3>
                <ItemsEditor items={items} onChange={setItems} inventory={inventory} />
                <p className="px-4 text-[13px] text-muted-foreground">Pode deixar em branco e orçar depois do diagnóstico.</p>
            </section>
            {items.length > 0 && (
                <Group>
                    <div className="px-4 min-h-[48px] flex items-center justify-between text-[17px]">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="tabular-nums">{brl(totals.subtotal)}</span>
                    </div>
                    <label htmlFor="os-discount" className="px-4 min-h-[48px] flex items-center justify-between gap-3 text-[17px]">
                        <span className="text-muted-foreground">Desconto</span>
                        <span className="flex items-baseline gap-1 w-32">
                            <span className="text-[15px] text-muted-foreground">R$</span>
                            <MoneyInput id="os-discount" value={v.discount} onChange={n => set('discount', n)} />
                        </span>
                    </label>
                    <div className="px-4 min-h-[52px] flex items-center justify-between">
                        <span className="text-[17px] font-semibold">Total</span>
                        <span className="text-[22px] font-semibold tabular-nums">{brl(totals.total)}</span>
                    </div>
                </Group>
            )}
        </div>
    )
}

/* ─── Entrega, garantia e termos ───────────────────────────────────────── */

function at(daysAhead: number, hour: number) {
    const d = new Date()
    d.setDate(d.getDate() + daysAhead)
    d.setHours(hour, 0, 0, 0)
    return getLocalDateTimePickerValue(d)
}

const WARRANTY = [0, 1, 3, 6, 12]

export function DeliverySection({ state, showTerms = true }: { state: OSFormState; showTerms?: boolean }) {
    const { values: v, set } = state
    const presets = [
        { value: at(0, 18), label: 'Hoje, 18h' },
        { value: at(1, 18), label: 'Amanhã, 18h' },
        { value: at(3, 18), label: 'Em 3 dias' },
        { value: at(7, 18), label: 'Em 1 semana' },
    ]
    return (
        <div className="space-y-6">
            <Group title="Previsão de entrega">
                <div className="px-4 pt-3 pb-1">
                    <Chips options={presets} value={presets.find(p => p.value === v.scheduled_date)?.value ?? ''} onChange={x => set('scheduled_date', x)} ariaLabel="Previsão de entrega" />
                </div>
                <Field label="Outra data e hora" htmlFor="os-when">
                    <div className="flex items-center gap-2">
                        <input
                            id="os-when"
                            type="datetime-local"
                            value={v.scheduled_date}
                            onChange={e => set('scheduled_date', e.target.value)}
                            className="flex-1 min-w-0 bg-foreground/[0.06] rounded-lg px-3 h-10 text-[16px] tabular-nums outline-none focus:ring-2 focus:ring-primary/40"
                        />
                        {v.scheduled_date && (
                            <button type="button" onClick={() => set('scheduled_date', '')} aria-label="Sem previsão" className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-foreground/[0.06] shrink-0">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </Field>
            </Group>

            <Group title="Garantia do serviço">
                <div className="px-4 py-3">
                    <Chips
                        options={WARRANTY.map(m => ({ value: String(m), label: m === 0 ? 'Sem garantia' : m === 1 ? '1 mês' : `${m} meses` }))}
                        value={String(v.warranty_months)}
                        onChange={m => set('warranty_months', Number(m))}
                        ariaLabel="Garantia"
                    />
                </div>
            </Group>

            {showTerms && (
                <Group footer={<>O cliente concorda com os termos de garantia da loja e com os <a href="/termos" target="_blank" rel="noopener noreferrer" className="text-primary">Termos de uso</a> e a <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="text-primary">Política de privacidade</a>.</>}>
                    <SwitchRow label="Cliente aceitou os termos" checked={v.terms_accepted} onChange={x => set('terms_accepted', x)} />
                </Group>
            )}
        </div>
    )
}
