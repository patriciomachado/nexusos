'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, CheckCircle2, ChevronLeft, Loader2, Printer } from 'lucide-react'
import Segmented from '@/components/ui/Segmented'
import { cn } from '@/lib/utils'
import { BottomBar, PrimaryButton, SecondaryButton } from './ui'
import { BudgetSection, ClientSection, DeliverySection, DeviceSection, LockSection, ProblemSection } from './sections'
import { saveOS, useOSForm, type InventoryOption, type Option, type OSFormState } from './state'

const STEPS = [
    { id: 'cliente', title: 'Cliente', subtitle: 'De quem é o aparelho' },
    { id: 'aparelho', title: 'Aparelho', subtitle: 'O que está entrando na loja' },
    { id: 'problema', title: 'Problema e estado', subtitle: 'O defeito e como o aparelho chegou' },
    { id: 'senha', title: 'Senha do aparelho', subtitle: 'Para o técnico conseguir testar' },
    { id: 'fechamento', title: 'Orçamento e entrega', subtitle: 'Valores, prazo e garantia' },
] as const

type Mode = 'guided' | 'quick'
const MODE_KEY = 'nexus_os_mode'

interface Props {
    customers: Option[]
    technicians: Option[]
    inventory: InventoryOption[]
    companyId: string
}

function scrollTop() {
    document.querySelector('main')?.scrollTo({ top: 0 })
}

function Created({ id, number, onAnother }: { id: string; number?: string; onAnother: () => void }) {
    return (
        <div className="max-w-md mx-auto px-4 py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto">
                <Check className="w-9 h-9" strokeWidth={3} />
            </div>
            <h2 className="mt-5 text-[28px] font-semibold tracking-tight">OS aberta</h2>
            {number && <p className="mt-1 text-[17px] text-muted-foreground tabular-nums">{number}</p>}
            <div className="mt-8 space-y-3">
                <Link href={`/service-orders/${id}`} className="h-12 w-full rounded-full bg-primary text-primary-foreground text-[17px] font-semibold inline-flex items-center justify-center">
                    Ver a OS
                </Link>
                <Link href={`/service-orders/${id}/print`} className="h-12 w-full rounded-full bg-foreground/[0.07] text-[17px] font-medium inline-flex items-center justify-center gap-2">
                    <Printer className="w-5 h-5" /> Imprimir comprovante
                </Link>
                <button type="button" onClick={onAnother} className="h-12 w-full rounded-full text-[17px] font-medium text-primary hover:bg-primary/10">
                    Abrir outra OS
                </button>
            </div>
        </div>
    )
}

/** One-screen version: customer, device and problem only. */
function QuickForm({ state, customers, setCustomers, technicians, companyId, onSubmit, saving }: {
    state: OSFormState; customers: Option[]; setCustomers: (l: Option[]) => void; technicians: Option[]; companyId: string; onSubmit: () => void; saving: boolean
}) {
    const [tried, setTried] = useState(false)
    const submit = () => {
        setTried(true)
        if (!state.values.customer_id) return toast.error('Escolha o cliente')
        if (!state.values.title.trim()) return toast.error('Informe o tipo de aparelho')
        onSubmit()
    }
    return (
        <>
            <div className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 space-y-6">
                <ClientSection state={state} customers={customers} onCustomersChange={setCustomers} technicians={technicians} companyId={companyId} compact invalid={tried && !state.values.customer_id} />
                <DeviceSection state={state} compact invalid={tried && !state.values.title.trim()} />
                <ProblemSection state={state} compact />
                <p className="px-4 text-[13px] text-muted-foreground">Fotos, senha, orçamento e prazo podem ser completados depois, na própria OS.</p>
            </div>
            <BottomBar>
                <PrimaryButton onClick={submit} disabled={saving} className="flex-1">
                    {saving && <Loader2 className="w-5 h-5 animate-spin" />} Abrir OS
                </PrimaryButton>
            </BottomBar>
        </>
    )
}

/**
 * New service order: guided (five steps) or quick (one screen). Both share
 * the same form state and sections as the edit page.
 */
export default function OSWizard(props: Props) {
    const [mode, setMode] = useState<Mode>('guided')
    const [round, setRound] = useState(0)

    useEffect(() => {
        try {
            const saved = localStorage.getItem(MODE_KEY)
            // eslint-disable-next-line react-hooks/set-state-in-effect
            if (saved === 'quick' || saved === 'guided') setMode(saved)
        } catch { /* private mode */ }
    }, [])

    const changeMode = (m: Mode) => {
        setMode(m)
        try { localStorage.setItem(MODE_KEY, m) } catch { /* ignore */ }
    }

    return <WizardBody key={round} {...props} mode={mode} onModeChange={changeMode} onAnother={() => { setRound(r => r + 1); scrollTop() }} />
}

function WizardBody({ customers: initialCustomers, technicians, inventory, companyId, mode, onModeChange, onAnother }: Props & { mode: Mode; onModeChange: (m: Mode) => void; onAnother: () => void }) {
    const router = useRouter()
    const state = useOSForm()
    const [customers, setCustomers] = useState(initialCustomers)
    const [step, setStep] = useState(0)
    const [tried, setTried] = useState<Record<number, boolean>>({})
    const [saving, setSaving] = useState(false)
    const [created, setCreated] = useState<{ id: string; number?: string } | null>(null)
    const v = state.values

    const problemOf = (i: number) => {
        if (i === 0 && !v.customer_id) return 'Escolha o cliente para continuar'
        if (i === 1 && !v.title.trim()) return 'Informe o tipo de aparelho'
        return null
    }

    const go = (i: number) => {
        // Only move forward past steps that are complete.
        for (let s = step; s < i; s++) {
            const p = problemOf(s)
            if (p) {
                setTried(t => ({ ...t, [s]: true }))
                setStep(s)
                toast.error(p)
                return
            }
        }
        setStep(i)
        scrollTop()
    }

    const submit = async () => {
        for (let s = 0; s < STEPS.length; s++) {
            const p = problemOf(s)
            if (p) { setTried(t => ({ ...t, [s]: true })); setStep(s); toast.error(p); return }
        }
        setSaving(true)
        try {
            const row = await saveOS(state, companyId)
            setCreated({ id: row.id, number: row.order_number })
            scrollTop()
            router.refresh()
        } catch (err) {
            toast.error((err as Error).message)
        } finally {
            setSaving(false)
        }
    }

    if (created) return <Created id={created.id} number={created.number} onAnother={onAnother} />

    const current = STEPS[step]
    const last = step === STEPS.length - 1
    const customerName = customers.find(c => c.id === v.customer_id)?.name

    return (
        <div className="pt-4 flex-1 flex flex-col">
            <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 mb-5">
                <Segmented<Mode>
                    value={mode}
                    onChange={onModeChange}
                    ariaLabel="Forma de abrir a OS"
                    className="w-full [&>button]:flex-1"
                    options={[{ value: 'guided', label: 'Passo a passo' }, { value: 'quick', label: 'Rápido' }]}
                />
            </div>

            {mode === 'quick' ? (
                <QuickForm state={state} customers={customers} setCustomers={setCustomers} technicians={technicians} companyId={companyId} onSubmit={submit} saving={saving} />
            ) : (
                <>
                    <div className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6">
                        {/* Progress: tap a finished step to go back to it */}
                        <nav aria-label="Etapas" className="mb-5">
                            <ol className="flex gap-1.5">
                                {STEPS.map((s, i) => (
                                    <li key={s.id} className="flex-1">
                                        <button
                                            type="button"
                                            onClick={() => i < step && go(i)}
                                            disabled={i >= step}
                                            aria-current={i === step ? 'step' : undefined}
                                            aria-label={`${i + 1}. ${s.title}`}
                                            className={cn('block w-full h-1.5 rounded-full transition-colors', i <= step ? 'bg-primary' : 'bg-foreground/[0.1]', i < step && 'cursor-pointer')}
                                        />
                                    </li>
                                ))}
                            </ol>
                            <p className="mt-3 text-[13px] font-medium text-muted-foreground">Passo {step + 1} de {STEPS.length}</p>
                            <h2 className="text-[28px] leading-tight font-semibold tracking-tight">{current.title}</h2>
                            <p className="text-[15px] text-muted-foreground">{current.subtitle}</p>
                        </nav>

                        <div key={current.id} className="animate-in fade-in duration-200">
                            {step === 0 && <ClientSection state={state} customers={customers} onCustomersChange={setCustomers} technicians={technicians} companyId={companyId} invalid={tried[0] && !v.customer_id} />}
                            {step === 1 && <DeviceSection state={state} invalid={tried[1] && !v.title.trim()} />}
                            {step === 2 && <ProblemSection state={state} />}
                            {step === 3 && <LockSection state={state} />}
                            {step === 4 && (
                                <div className="space-y-6">
                                    <div className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60">
                                        {[
                                            { label: 'Cliente', value: customerName, step: 0 },
                                            { label: 'Aparelho', value: [v.title, v.equipment_description].filter(Boolean).join(' · '), step: 1 },
                                            { label: 'Defeito', value: v.problem_description, step: 2 },
                                            { label: 'Senha', value: v.lock ? (v.lock.type === 'pin' ? 'PIN ou senha informada' : 'Padrão informado') : 'Sem senha', step: 3 },
                                        ].map(r => (
                                            <button key={r.label} type="button" onClick={() => go(r.step)} className="w-full flex items-center gap-3 px-4 min-h-[48px] py-2 text-left">
                                                <span className="w-20 shrink-0 text-[15px] text-muted-foreground">{r.label}</span>
                                                <span className={cn('flex-1 min-w-0 text-[15px] line-clamp-2', !r.value && 'text-muted-foreground/60')}>{r.value || 'Não informado'}</span>
                                                <span className="text-[15px] text-primary shrink-0">Editar</span>
                                            </button>
                                        ))}
                                    </div>
                                    <BudgetSection state={state} inventory={inventory} />
                                    <DeliverySection state={state} />
                                </div>
                            )}
                        </div>
                    </div>

                    <BottomBar>
                        {step > 0 && (
                            <SecondaryButton onClick={() => go(step - 1)} aria-label="Voltar" className="px-4">
                                <ChevronLeft className="w-5 h-5" /> <span className="hidden sm:inline">Voltar</span>
                            </SecondaryButton>
                        )}
                        {last ? (
                            <PrimaryButton onClick={submit} disabled={saving} className="flex-1">
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                {saving ? 'Abrindo…' : 'Abrir OS'}
                            </PrimaryButton>
                        ) : (
                            <PrimaryButton onClick={() => go(step + 1)} className="flex-1">
                                {step === 3 && !v.lock ? 'Pular' : 'Continuar'}
                            </PrimaryButton>
                        )}
                    </BottomBar>
                </>
            )}
        </div>
    )
}
