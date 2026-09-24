'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Minus, Plus, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import Sheet from './Sheet'
import Segmented from '@/components/ui/Segmented'
import { ModuleTile } from './AlertRow'
import { formatDuration } from '@/lib/tasks/parse'
import { addDays, relativeDayLabel, longDayLabel } from '@/lib/tasks/dates'
import type { Task, TaskAlert } from '@/lib/tasks/types'

type Dest = 'today' | 'tomorrow' | 'someday'

interface PlanDaySheetProps {
    open: boolean
    onClose: () => void
    today: string
    tasks: Task[]
    alerts: TaskAlert[]
    capacityMinutes: number
    onCapacityChange: (minutes: number) => void
    onConfirm: (plan: { move: Record<Dest, string[]>; bringToday: string[]; alerts: TaskAlert[] }) => Promise<void>
}

export function workloadOf(tasks: Task[]) {
    const planned = tasks.reduce((sum, t) => sum + (t.duration_minutes ?? 0), 0)
    const unestimated = tasks.filter(t => !t.duration_minutes).length
    return { planned, unestimated }
}

export function WorkloadBar({ planned, capacity, unestimated, className }: { planned: number; capacity: number; unestimated: number; className?: string }) {
    const ratio = capacity > 0 ? planned / capacity : 0
    const over = planned > capacity
    return (
        <div className={className}>
            <div className="flex items-baseline justify-between gap-2 text-[13px]">
                <span className={cn('font-medium', over ? 'text-red-600 dark:text-red-400' : 'text-foreground')}>
                    {formatDuration(planned || 0)} planejadas de {formatDuration(capacity)}
                </span>
                {unestimated > 0 && <span className="text-muted-foreground">{unestimated} sem estimativa</span>}
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-foreground/10 overflow-hidden" role="meter" aria-valuemin={0} aria-valuemax={capacity} aria-valuenow={planned} aria-label="Carga do dia">
                <div className={cn('h-full rounded-full transition-[width] duration-500', over ? 'bg-red-500' : ratio > 0.85 ? 'bg-orange-500' : 'bg-green-500')} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
            </div>
            {over && (
                <p className="mt-1.5 text-[13px] text-red-600 dark:text-red-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Seu dia passou {formatDuration(planned - capacity)} do tempo disponível. Que tal mover algo para amanhã?
                </p>
            )}
        </div>
    )
}

export default function PlanDaySheet({ open, onClose, today, tasks, alerts, capacityMinutes, onCapacityChange, onConfirm }: PlanDaySheetProps) {
    const carried = useMemo(() => tasks.filter(t => t.do_date === today && (t.rollover_count > 0 || (t.deadline && t.deadline < today))), [tasks, today])
    const plannedToday = useMemo(() => tasks.filter(t => t.do_date === today && !carried.includes(t)), [tasks, today, carried])
    const candidates = useMemo(() => tasks.filter(t => t.do_date === null || (t.do_date > today && t.do_date <= addDays(today, 3))).slice(0, 12), [tasks, today])
    const todayAlerts = useMemo(() => alerts.filter(a => a.date <= today && a.severity !== 'low').slice(0, 10), [alerts, today])

    const [dest, setDest] = useState<Record<string, Dest>>({})
    const [bring, setBring] = useState<Set<string>>(new Set())
    const [pickedAlerts, setPickedAlerts] = useState<Set<string>>(new Set())
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!open) return
        setDest(Object.fromEntries(carried.map(t => [t.id, 'today' as Dest])))
        setBring(new Set())
        setPickedAlerts(new Set(todayAlerts.filter(a => a.severity === 'high').map(a => a.key)))
    // Only reset when the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    const dayTasks = [
        ...plannedToday,
        ...carried.filter(t => (dest[t.id] ?? 'today') === 'today'),
        ...candidates.filter(t => bring.has(t.id)),
    ]
    const { planned, unestimated } = workloadOf(dayTasks)
    const totalToday = dayTasks.length + pickedAlerts.size

    const confirm = async () => {
        setSaving(true)
        const move: Record<Dest, string[]> = { today: [], tomorrow: [], someday: [] }
        for (const t of carried) move[dest[t.id] ?? 'today'].push(t.id)
        await onConfirm({ move, bringToday: [...bring], alerts: todayAlerts.filter(a => pickedAlerts.has(a.key)) })
        setSaving(false)
    }

    const toggle = (set: Set<string>, key: string) => {
        const next = new Set(set)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        return next
    }

    return (
        <Sheet
            open={open}
            onClose={onClose}
            title="Planejar meu dia"
            subtitle={longDayLabel(today)}
            size="lg"
            footer={
                <div className="w-full space-y-3">
                    <WorkloadBar planned={planned} capacity={capacityMinutes} unestimated={unestimated} />
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] text-muted-foreground">Tempo disponível</span>
                        <button type="button" aria-label="Menos uma hora" onClick={() => onCapacityChange(Math.max(60, capacityMinutes - 60))} className="w-8 h-8 rounded-full bg-foreground/[0.06] flex items-center justify-center"><Minus className="w-4 h-4" /></button>
                        <span className="text-[15px] font-medium tabular-nums w-10 text-center">{capacityMinutes / 60}h</span>
                        <button type="button" aria-label="Mais uma hora" onClick={() => onCapacityChange(Math.min(16 * 60, capacityMinutes + 60))} className="w-8 h-8 rounded-full bg-foreground/[0.06] flex items-center justify-center"><Plus className="w-4 h-4" /></button>
                        <div className="hidden sm:block flex-1" />
                        <button
                            type="button"
                            onClick={confirm}
                            disabled={saving}
                            className="h-11 px-5 rounded-xl bg-primary text-primary-foreground text-[15px] font-semibold disabled:opacity-50 w-full sm:w-auto whitespace-nowrap"
                        >
                            {saving ? 'Organizando…' : `Começar o dia${totalToday ? ` (${totalToday})` : ''}`}
                        </button>
                    </div>
                </div>
            }
        >
            <div className="space-y-6">
                <p className="text-[15px] text-muted-foreground">
                    Escolha o que é realista para hoje. O resto pode esperar sem ser esquecido.
                </p>

                {carried.length > 0 && (
                    <PlanGroup title="Ficou pendente" hint="Tarefas que vieram de dias anteriores ou estão com prazo vencido.">
                        {carried.map(t => (
                            <div key={t.id} className="px-4 py-3 space-y-2">
                                <div>
                                    <p className="text-[15px] text-foreground">{t.title}</p>
                                    <p className="text-[13px] text-muted-foreground">
                                        {t.rollover_count > 0 && `Adiada ${t.rollover_count}×`}
                                        {t.deadline && t.deadline < today && `${t.rollover_count > 0 ? ' · ' : ''}Prazo era ${relativeDayLabel(t.deadline, today).toLowerCase()}`}
                                        {t.duration_minutes ? ` · ${formatDuration(t.duration_minutes)}` : ''}
                                    </p>
                                </div>
                                <Segmented<Dest>
                                    size="sm"
                                    ariaLabel={`Quando fazer ${t.title}`}
                                    value={dest[t.id] ?? 'today'}
                                    onChange={v => setDest(d => ({ ...d, [t.id]: v }))}
                                    options={[{ value: 'today', label: 'Hoje' }, { value: 'tomorrow', label: 'Amanhã' }, { value: 'someday', label: 'Algum dia' }]}
                                />
                            </div>
                        ))}
                    </PlanGroup>
                )}

                {todayAlerts.length > 0 && (
                    <PlanGroup title="Dos outros módulos" hint="Marque o que você vai resolver hoje. Vira uma tarefa com link para o módulo.">
                        {todayAlerts.map(a => (
                            <CheckRow key={a.key} checked={pickedAlerts.has(a.key)} onToggle={() => setPickedAlerts(s => toggle(s, a.key))}>
                                <ModuleTile module={a.module} />
                                <span className="flex-1 min-w-0">
                                    <span className="block text-[15px] text-foreground truncate">{a.suggestion}</span>
                                    <span className="block text-[13px] text-muted-foreground truncate">{a.title}</span>
                                </span>
                            </CheckRow>
                        ))}
                    </PlanGroup>
                )}

                {candidates.length > 0 && (
                    <PlanGroup title="Adiantar para hoje" hint="Tarefas sem data ou dos próximos dias.">
                        {candidates.map(t => (
                            <CheckRow key={t.id} checked={bring.has(t.id)} onToggle={() => setBring(s => toggle(s, t.id))}>
                                <span className="flex-1 min-w-0">
                                    <span className="block text-[15px] text-foreground truncate">{t.title}</span>
                                    <span className="block text-[13px] text-muted-foreground">
                                        {t.do_date ? relativeDayLabel(t.do_date, today) : 'Algum dia'}
                                        {t.duration_minutes ? ` · ${formatDuration(t.duration_minutes)}` : ''}
                                    </span>
                                </span>
                            </CheckRow>
                        ))}
                    </PlanGroup>
                )}

                {carried.length === 0 && todayAlerts.length === 0 && candidates.length === 0 && (
                    <p className="text-[15px] text-foreground">Nada pendente de antes. Seu dia já está organizado.</p>
                )}
            </div>
        </Sheet>
    )
}

function PlanGroup({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
    return (
        <section>
            <h3 className="type-headline text-foreground">{title}</h3>
            <p className="text-[13px] text-muted-foreground mb-2">{hint}</p>
            <div className="rounded-xl bg-foreground/[0.03] border border-border/60 divide-y divide-border/60">{children}</div>
        </section>
    )
}

function CheckRow({ checked, onToggle, children }: { checked: boolean; onToggle: () => void; children: React.ReactNode }) {
    return (
        <button type="button" role="checkbox" aria-checked={checked} onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 text-left">
            <span className={cn('w-[22px] h-[22px] rounded-full border-[1.75px] flex items-center justify-center shrink-0 transition-colors', checked ? 'bg-primary border-primary' : 'border-muted-foreground/50')}>
                {checked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
            </span>
            {children}
        </button>
    )
}
