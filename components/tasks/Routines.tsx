'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronDown, ChevronUp, Flame, Plus, Trash2, X, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import Sheet from './Sheet'
import Segmented from '@/components/ui/Segmented'
import PremiumConfirmDialog from '@/components/ui/PremiumConfirmDialog'
import { newId } from './api'
import { PERIOD_META, type Routine, type RoutineRun, type DayPeriod } from '@/lib/tasks/types'
import { addDays, weekdayOf, WEEKDAYS } from '@/lib/tasks/dates'

export function isScheduled(routine: Routine, day: string) {
    return routine.is_active && routine.weekdays.includes(weekdayOf(day))
}

function runOf(runs: RoutineRun[], routine: Routine, day: string) {
    return runs.find(r => r.routine_id === routine.id && r.run_date === day)
}

/** Consecutive scheduled days completed, counting back from today (or yesterday if today is still open). */
export function streakOf(routine: Routine, runs: RoutineRun[], today: string) {
    let streak = 0
    let day = today
    const todayRun = runOf(runs, routine, today)
    if (isScheduled(routine, today) && !todayRun?.completed_at) day = addDays(today, -1)
    for (let i = 0; i < 60; i++) {
        if (isScheduled(routine, day)) {
            if (runOf(runs, routine, day)?.completed_at) streak++
            else break
        }
        day = addDays(day, -1)
    }
    return streak
}

function ProgressRing({ value, size = 28 }: { value: number; size?: number }) {
    const r = (size - 4) / 2
    const c = 2 * Math.PI * r
    return (
        <svg width={size} height={size} className="-rotate-90 shrink-0" aria-hidden>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="3" className="stroke-foreground/10" />
            <circle
                cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="3" strokeLinecap="round"
                strokeDasharray={c} strokeDashoffset={c * (1 - value)}
                className={cn('transition-[stroke-dashoffset] duration-500', value >= 1 ? 'stroke-green-500' : 'stroke-primary')}
            />
        </svg>
    )
}

interface RoutineCardProps {
    routine: Routine
    runs: RoutineRun[]
    today: string
    onToggle: (routine: Routine, date: string, stepId: string, done: boolean) => void
}

/** Today's checklist for one routine. Collapses once finished. */
export function RoutineCard({ routine, runs, today, onToggle }: RoutineCardProps) {
    const run = runOf(runs, routine, today)
    const done = new Set(run?.completed_steps ?? [])
    const progress = routine.steps.length ? done.size / routine.steps.length : 0
    const complete = progress >= 1
    const [open, setOpen] = useState(!complete)
    const streak = streakOf(routine, runs, today)

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (complete) setOpen(false)
    }, [complete])

    return (
        <div>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
            >
                <ProgressRing value={progress} />
                <span className="flex-1 min-w-0">
                    <span className={cn('block text-[15px] font-medium truncate', complete ? 'text-muted-foreground' : 'text-foreground')}>{routine.name}</span>
                    <span className="block text-[13px] text-muted-foreground">
                        {done.size} de {routine.steps.length} passos
                        {routine.remind_time && ` · ${routine.remind_time.slice(0, 5)}`}
                    </span>
                </span>
                {streak > 1 && (
                    <span className="inline-flex items-center gap-1 text-[13px] font-medium text-orange-600 dark:text-orange-400" title={`${streak} dias seguidos`}>
                        <Flame className="w-4 h-4" />{streak}
                    </span>
                )}
                <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
            </button>
            {open && (
                <ul className="pb-2">
                    {routine.steps.map(step => {
                        const checked = done.has(step.id)
                        return (
                            <li key={step.id}>
                                <button
                                    type="button"
                                    role="checkbox"
                                    aria-checked={checked}
                                    onClick={() => onToggle(routine, today, step.id, !checked)}
                                    className="w-full flex items-center gap-3 pl-[52px] pr-4 min-h-11 text-left hover:bg-foreground/[0.03]"
                                >
                                    <span className={cn('w-5 h-5 rounded-md border-[1.75px] flex items-center justify-center shrink-0 transition-colors', checked ? 'bg-green-500 border-green-500' : 'border-muted-foreground/50')}>
                                        {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                    </span>
                                    <span className={cn('text-[15px]', checked ? 'text-muted-foreground line-through' : 'text-foreground')}>{step.title}</span>
                                </button>
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}

const TEMPLATES: { name: string; day_period: DayPeriod; weekdays: number[]; steps: string[] }[] = [
    { name: 'Abertura da loja', day_period: 'morning', weekdays: [1, 2, 3, 4, 5, 6], steps: ['Abrir o caixa com o troco', 'Conferir OS do dia na Mesa', 'Responder mensagens do WhatsApp', 'Organizar vitrine e balcão'] },
    { name: 'Fechamento do dia', day_period: 'evening', weekdays: [1, 2, 3, 4, 5, 6], steps: ['Conferir e fechar o caixa', 'Atualizar status das OS', 'Guardar aparelhos dos clientes', 'Planejar o dia seguinte'] },
    { name: 'Revisão semanal', day_period: 'afternoon', weekdays: [5], steps: ['Revisar estoque e fazer pedidos', 'Cobrar recebimentos em aberto', 'Ver avaliações do pós-venda', 'Conferir despesas da próxima semana'] },
]

interface RoutinesViewProps {
    routines: Routine[]
    runs: RoutineRun[]
    today: string
    onSave: (routine: Partial<Routine> & Pick<Routine, 'name' | 'weekdays' | 'day_period' | 'steps' | 'remind_time'>) => Promise<boolean>
    onDelete: (routine: Routine) => void
}

export default function RoutinesView({ routines, runs, today, onSave, onDelete }: RoutinesViewProps) {
    const [editing, setEditing] = useState<Routine | null>(null)
    const [creating, setCreating] = useState<(typeof TEMPLATES)[number] | 'blank' | null>(null)

    const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))

    return (
        <div className="space-y-6">
            <p className="px-4 sm:px-1 text-[15px] text-muted-foreground max-w-2xl">
                Rotinas são checklists que aparecem sozinhos em <strong className="font-semibold text-foreground">Hoje</strong> nos dias escolhidos.
                Bom para abertura da loja, fechamento do caixa e revisões semanais.
            </p>

            {routines.length > 0 && (
                <div className="bg-card sm:rounded-2xl border-y sm:border border-border/60 divide-y divide-border/60">
                    {routines.map(r => (
                        <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                            <div className="flex-1 min-w-0">
                                <p className={cn('text-[15px] font-medium', r.is_active ? 'text-foreground' : 'text-muted-foreground')}>{r.name}</p>
                                <p className="text-[13px] text-muted-foreground">
                                    {r.weekdays.length === 7 ? 'Todo dia' : r.weekdays.map(d => WEEKDAYS[d].slice(0, 3)).join(', ')}
                                    {' · '}{PERIOD_META[r.day_period].label}
                                    {' · '}{r.steps.length} passos
                                    {!r.is_active && ' · pausada'}
                                </p>
                                <div className="mt-1.5 flex gap-1" aria-label="Últimos 7 dias">
                                    {last7.map(d => {
                                        const scheduled = isScheduled(r, d)
                                        const doneDay = !!runs.find(x => x.routine_id === r.id && x.run_date === d)?.completed_at
                                        return (
                                            <span
                                                key={d}
                                                title={d}
                                                className={cn('w-3.5 h-3.5 rounded-full', !scheduled ? 'bg-foreground/[0.05]' : doneDay ? 'bg-green-500' : d === today ? 'border-2 border-primary' : 'bg-foreground/15')}
                                            />
                                        )
                                    })}
                                    {streakOf(r, runs, today) > 1 && (
                                        <span className="ml-1 text-[13px] text-orange-600 dark:text-orange-400 inline-flex items-center gap-0.5">
                                            <Flame className="w-3.5 h-3.5" />{streakOf(r, runs, today)}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditing(r)}
                                className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-foreground/[0.05]"
                                aria-label={`Editar ${r.name}`}
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <section className="space-y-2">
                <h2 className="px-4 sm:px-1 type-headline text-foreground">{routines.length ? 'Adicionar rotina' : 'Comece com um modelo'}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-4 sm:px-0">
                    {TEMPLATES.filter(t => !routines.some(r => r.name === t.name)).map(t => (
                        <button
                            key={t.name}
                            type="button"
                            onClick={() => setCreating(t)}
                            className="text-left bg-card rounded-2xl border border-border/60 p-4 hover:border-primary/50 transition-colors"
                        >
                            <p className="text-[15px] font-semibold text-foreground">{t.name}</p>
                            <p className="text-[13px] text-muted-foreground mt-0.5">{t.steps.length} passos · {PERIOD_META[t.day_period].label}</p>
                            <p className="text-[13px] text-muted-foreground mt-2 line-clamp-2">{t.steps.join(' · ')}</p>
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={() => setCreating('blank')}
                        className="flex items-center justify-center gap-2 bg-card rounded-2xl border border-dashed border-border p-4 text-[15px] font-medium text-primary hover:border-primary/50"
                    >
                        <Plus className="w-4 h-4" /> Rotina em branco
                    </button>
                </div>
            </section>

            <RoutineEditor
                open={!!editing || !!creating}
                routine={editing}
                template={creating && creating !== 'blank' ? creating : undefined}
                onClose={() => { setEditing(null); setCreating(null) }}
                onSave={async r => { const ok = await onSave(r); if (ok) { setEditing(null); setCreating(null) } }}
                onDelete={r => { setEditing(null); onDelete(r) }}
            />
        </div>
    )
}

interface RoutineEditorProps {
    open: boolean
    routine: Routine | null
    template?: (typeof TEMPLATES)[number]
    onClose: () => void
    onSave: (routine: Partial<Routine> & Pick<Routine, 'name' | 'weekdays' | 'day_period' | 'steps' | 'remind_time'>) => void
    onDelete: (routine: Routine) => void
}

function RoutineEditor({ open, routine, template, onClose, onSave, onDelete }: RoutineEditorProps) {
    const [name, setName] = useState('')
    const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5, 6])
    const [period, setPeriod] = useState<DayPeriod>('morning')
    const [remindTime, setRemindTime] = useState('')
    const [steps, setSteps] = useState<{ id: string; title: string }[]>([])
    const [newStep, setNewStep] = useState('')
    const [active, setActive] = useState(true)
    const [error, setError] = useState('')
    const [confirmDelete, setConfirmDelete] = useState(false)

    useEffect(() => {
        if (!open) return
        /* eslint-disable react-hooks/set-state-in-effect */
        setName(routine?.name ?? template?.name ?? '')
        setWeekdays(routine?.weekdays ?? template?.weekdays ?? [1, 2, 3, 4, 5, 6])
        setPeriod(routine?.day_period ?? template?.day_period ?? 'morning')
        setRemindTime(routine?.remind_time?.slice(0, 5) ?? '')
        setSteps(routine?.steps ?? template?.steps.map(title => ({ id: newId(), title })) ?? [])
        setActive(routine?.is_active ?? true)
        setNewStep('')
        setError('')
        /* eslint-enable react-hooks/set-state-in-effect */
    }, [open, routine, template])

    const addStep = () => {
        const t = newStep.trim()
        if (!t) return
        setSteps(s => [...s, { id: newId(), title: t }])
        setNewStep('')
    }

    const move = (idx: number, dir: -1 | 1) => {
        setSteps(s => {
            const next = [...s]
            const j = idx + dir
            if (j < 0 || j >= next.length) return s
            ;[next[idx], next[j]] = [next[j], next[idx]]
            return next
        })
    }

    const save = () => {
        const finalSteps = newStep.trim() ? [...steps, { id: newId(), title: newStep.trim() }] : steps
        if (!name.trim()) return setError('Dê um nome para a rotina.')
        if (weekdays.length === 0) return setError('Escolha ao menos um dia da semana.')
        if (finalSteps.length === 0) return setError('Adicione ao menos um passo.')
        onSave({ id: routine?.id, name: name.trim(), weekdays, day_period: period, remind_time: remindTime || null, steps: finalSteps, is_active: active })
    }

    return (
        <>
            <Sheet
                open={open}
                onClose={onClose}
                title={routine ? 'Editar rotina' : 'Nova rotina'}
                footer={
                    <>
                        {routine && (
                            <button type="button" onClick={() => setConfirmDelete(true)} aria-label="Apagar rotina" className="h-11 w-11 -ml-2 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 hover:bg-red-500/10">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                        <div className="flex-1" />
                        <button type="button" onClick={onClose} className="h-11 px-4 rounded-xl text-[15px] text-primary hover:bg-foreground/[0.05]">Cancelar</button>
                        <button type="button" onClick={save} className="h-11 px-5 rounded-xl bg-primary text-primary-foreground text-[15px] font-semibold">Salvar</button>
                    </>
                }
            >
                <div className="space-y-5">
                    <input
                        data-autofocus
                        value={name}
                        onChange={e => { setName(e.target.value); setError('') }}
                        placeholder="Nome da rotina"
                        aria-label="Nome da rotina"
                        className="w-full h-12 px-4 rounded-xl bg-foreground/[0.04] text-[17px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    {error && <p role="alert" className="text-[13px] text-red-600 dark:text-red-400 -mt-2">{error}</p>}

                    <div>
                        <h3 className="text-[13px] font-medium text-muted-foreground mb-2">Dias</h3>
                        <div className="flex gap-1.5" role="group" aria-label="Dias da semana">
                            {WEEKDAYS.map((n, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    aria-pressed={weekdays.includes(i)}
                                    aria-label={n}
                                    onClick={() => setWeekdays(w => (w.includes(i) ? w.filter(x => x !== i) : [...w, i].sort()))}
                                    className={cn('w-10 h-10 rounded-full text-[13px] font-semibold transition-colors', weekdays.includes(i) ? 'bg-primary text-primary-foreground' : 'bg-foreground/[0.05] text-muted-foreground')}
                                >
                                    {n.charAt(0).toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-[13px] font-medium text-muted-foreground mb-2">Período</h3>
                        <Segmented
                            size="sm"
                            ariaLabel="Período"
                            value={period}
                            onChange={setPeriod}
                            options={[{ value: 'morning', label: 'Manhã' }, { value: 'afternoon', label: 'Tarde' }, { value: 'evening', label: 'Fim do dia' }]}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <label htmlFor="routine-time" className="text-[13px] font-medium text-muted-foreground">Lembrar às</label>
                        <input id="routine-time" type="time" value={remindTime} onChange={e => setRemindTime(e.target.value)} className="h-9 px-3 rounded-full bg-foreground/[0.05] text-[14px] tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40" />
                        {remindTime && (
                            <button type="button" onClick={() => setRemindTime('')} aria-label="Sem horário" className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-foreground/[0.07]"><X className="w-4 h-4" /></button>
                        )}
                    </div>

                    <div>
                        <h3 className="text-[13px] font-medium text-muted-foreground mb-2">Passos</h3>
                        <ul className="rounded-xl bg-foreground/[0.04] divide-y divide-border/60">
                            {steps.map((s, i) => (
                                <li key={s.id} className="flex items-center gap-1 pl-2 pr-1 min-h-11">
                                    <span className="w-6 text-[13px] text-muted-foreground tabular-nums text-right mr-2">{i + 1}.</span>
                                    <input
                                        value={s.title}
                                        onChange={e => setSteps(list => list.map(x => (x.id === s.id ? { ...x, title: e.target.value } : x)))}
                                        aria-label={`Passo ${i + 1}`}
                                        className="flex-1 min-w-0 h-11 bg-transparent text-[15px] focus:outline-none"
                                    />
                                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Mover para cima" className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground disabled:opacity-20"><ChevronUp className="w-4 h-4" /></button>
                                    <button type="button" onClick={() => move(i, 1)} disabled={i === steps.length - 1} aria-label="Mover para baixo" className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground disabled:opacity-20"><ChevronDown className="w-4 h-4" /></button>
                                    <button type="button" onClick={() => setSteps(list => list.filter(x => x.id !== s.id))} aria-label="Remover passo" className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-foreground/[0.07]"><X className="w-4 h-4" /></button>
                                </li>
                            ))}
                            <li className="flex items-center gap-3 px-3 h-11">
                                <Plus className="w-5 h-5 text-muted-foreground" />
                                <input
                                    value={newStep}
                                    onChange={e => setNewStep(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addStep() } }}
                                    placeholder="Adicionar passo"
                                    aria-label="Novo passo"
                                    className="flex-1 h-11 bg-transparent text-[15px] placeholder:text-muted-foreground focus:outline-none"
                                />
                            </li>
                        </ul>
                    </div>

                    {routine && (
                        <label className="flex items-center justify-between gap-3 rounded-xl bg-foreground/[0.04] px-4 h-12">
                            <span className="text-[15px] text-foreground">Rotina ativa</span>
                            <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="w-5 h-5 accent-[hsl(var(--primary))]" />
                        </label>
                    )}
                </div>
            </Sheet>
            <PremiumConfirmDialog
                isOpen={confirmDelete}
                title="Apagar rotina?"
                description="O histórico dessa rotina também será apagado."
                confirmLabel="Apagar"
                onCancel={() => setConfirmDelete(false)}
                onConfirm={() => { setConfirmDelete(false); if (routine) onDelete(routine) }}
            />
        </>
    )
}
