'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Sunrise, CalendarClock, Database, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import Segmented from '@/components/ui/Segmented'
import { useTasks } from './useTasks'
import TaskRow from './TaskRow'
import AlertRow from './AlertRow'
import QuickAdd from './QuickAdd'
import TaskEditor from './TaskEditor'
import Section, { EmptyRow } from './Section'
import Timeline from './Timeline'
import MatrixView from './MatrixView'
import DoneView, { SkeletonList } from './DoneView'
import RoutinesView, { RoutineCard, isScheduled } from './Routines'
import PlanDaySheet, { WorkloadBar, workloadOf } from './PlanDaySheet'
import PushToggle from './PushToggle'
import { openQuickAdd } from './QuickAddDialog'
import type { TaskInput } from './api'
import { periodOfTime, PERIOD_META, type Task, type TaskAlert, type DayPeriod } from '@/lib/tasks/types'
import { addDays, relativeDayLabel, longDayLabel, localDateString, weekdayOf } from '@/lib/tasks/dates'

type View = 'today' | 'upcoming' | 'someday' | 'matrix' | 'routines' | 'done'
const VIEWS: View[] = ['today', 'upcoming', 'someday', 'matrix', 'routines', 'done']

const TITLES: Record<View, string> = {
    today: 'Hoje',
    upcoming: 'Próximos',
    someday: 'Algum dia',
    matrix: 'Prioridades',
    routines: 'Rotinas',
    done: 'Concluídas',
}

function readStorage(key: string) {
    try { return window.localStorage.getItem(key) } catch { return null }
}
function writeStorage(key: string, value: string) {
    try { window.localStorage.setItem(key, value) } catch { /* private mode */ }
}

export default function TasksClient() {
    const ctl = useTasks()
    const { data, error, loading } = ctl
    const router = useRouter()
    const searchParams = useSearchParams()

    const initialView = (searchParams?.get('view') as View) || 'today'
    const [view, setView] = useState<View>(VIEWS.includes(initialView) ? initialView : 'today')
    const [mobileMode, setMobileMode] = useState<'list' | 'timeline'>('list')
    const [editing, setEditing] = useState<Task | null>(null)
    const [creating, setCreating] = useState<Partial<TaskInput> | null>(null)
    const [planning, setPlanning] = useState(false)
    const [capacity, setCapacity] = useState(480)
    const [plannedToday, setPlannedToday] = useState(true)

    // "Today" is the viewer's local day; never compute it during server render.
    const [clientToday, setClientToday] = useState<string | null>(null)
    const today = data?.today ?? clientToday ?? ''

    useEffect(() => {
        /* eslint-disable react-hooks/set-state-in-effect */
        setClientToday(localDateString())
        const cap = Number(readStorage('tarefas:capacity'))
        if (cap >= 60 && cap <= 960) setCapacity(cap)
        setPlannedToday(readStorage('tarefas:planned') === localDateString())
        /* eslint-enable react-hooks/set-state-in-effect */
    }, [])

    const changeView = (v: View) => {
        setView(v)
        const params = new URLSearchParams(searchParams?.toString())
        if (v === 'today') params.delete('view')
        else params.set('view', v)
        params.delete('task')
        router.replace(`/tarefas${params.toString() ? `?${params}` : ''}`, { scroll: false })
    }

    // Deep link from a notification: /tarefas?task=<id>
    const taskParam = searchParams?.get('task')
    useEffect(() => {
        if (!taskParam || !data) return
        const t = data.tasks.find(x => x.id === taskParam)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (t) setEditing(t)
    }, [taskParam, data])

    const closeEditor = useCallback(() => {
        setEditing(null)
        setCreating(null)
        if (taskParam) {
            const params = new URLSearchParams(searchParams?.toString())
            params.delete('task')
            router.replace(`/tarefas${params.toString() ? `?${params}` : ''}`, { scroll: false })
        }
    }, [taskParam, searchParams, router])

    const saveFromEditor = async (input: TaskInput, task: Task | null) => {
        const saved = task ? await ctl.updateTask(task.id, input) : await ctl.createTask(input)
        if (saved) closeEditor()
    }

    // ----- derived lists -----
    const tasks = useMemo(() => data?.tasks ?? [], [data])
    const alerts = useMemo(() => data?.alerts ?? [], [data])

    const overdue = useMemo(() => tasks.filter(t => t.deadline && t.deadline < today), [tasks, today])
    const todayTasks = useMemo(() => tasks.filter(t => t.do_date !== null && t.do_date <= today && !overdue.includes(t)), [tasks, today, overdue])
    const todayAlerts = useMemo(() => alerts.filter(a => a.date <= today), [alerts, today])
    const routinesToday = useMemo(() => (data?.routines ?? []).filter(r => isScheduled(r, today)), [data, today])
    const somedayTasks = useMemo(() => tasks.filter(t => t.do_date === null && !overdue.includes(t)), [tasks, overdue])

    const byPeriod = useMemo(() => {
        const groups: Record<DayPeriod | 'any', Task[]> = { any: [], morning: [], afternoon: [], evening: [] }
        for (const t of todayTasks) groups[t.day_period ?? periodOfTime(t.do_time) ?? 'any'].push(t)
        return groups
    }, [todayTasks])

    const workload = workloadOf([...todayTasks, ...overdue.filter(t => t.do_date !== null && t.do_date <= today)])
    const needsPlanning = !plannedToday && (tasks.some(t => t.rollover_count > 0 && t.do_date === today) || todayAlerts.some(a => a.severity === 'high') || overdue.length > 0)

    const confirmPlan = async ({ move, bringToday, alerts: picked }: { move: { today: string[]; tomorrow: string[]; someday: string[] }; bringToday: string[]; alerts: TaskAlert[] }) => {
        await Promise.all([
            ctl.moveTasks(move.tomorrow, addDays(today, 1)),
            ctl.moveTasks(move.someday, null),
            ctl.moveTasks(bringToday, today),
        ])
        for (const a of picked) await ctl.convertAlert(a, today)
        writeStorage('tarefas:planned', today)
        setPlannedToday(true)
        setPlanning(false)
    }

    const rowProps = { today, onComplete: ctl.completeTask, onOpen: setEditing }
    const alertProps = {
        today,
        onConvert: (a: TaskAlert) => ctl.convertAlert(a, a.date < today ? today : a.date),
        onSnooze: (a: TaskAlert, until: string) => ctl.alertAction(a, 'snooze', until),
        onDismiss: (a: TaskAlert) => ctl.alertAction(a, 'dismiss'),
    }

    const counts = {
        today: todayTasks.length + overdue.length + todayAlerts.length,
        upcoming: tasks.filter(t => t.do_date && t.do_date > today).length,
        someday: somedayTasks.length,
    }

    return (
        <div className="max-w-[1200px] mx-auto pb-28 lg:pb-12">
            {/* Title area */}
            <div className="px-4 sm:px-6 lg:px-8 pt-5 sm:pt-8 pb-4 flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[13px] font-medium text-muted-foreground h-[18px]">{today ? longDayLabel(today) : ''}</p>
                    <h1 className="type-large-title text-foreground">{TITLES[view]}</h1>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <PushToggle />
                    {view === 'today' && (
                        <button
                            type="button"
                            onClick={() => setPlanning(true)}
                            className="h-9 px-3 rounded-full bg-primary/12 text-primary text-[13px] font-semibold inline-flex items-center gap-1.5 hover:bg-primary/18"
                        >
                            <Sunrise className="w-4 h-4" /> Planejar meu dia
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setCreating({ do_date: view === 'someday' ? null : view === 'upcoming' ? addDays(today, 1) : today })}
                        className="hidden sm:inline-flex h-9 px-3.5 rounded-full bg-primary text-primary-foreground text-[13px] font-semibold items-center gap-1.5"
                    >
                        <Plus className="w-4 h-4" strokeWidth={2.5} /> Nova tarefa
                    </button>
                </div>
            </div>

            {/* View switcher */}
            <div className="px-4 sm:px-6 lg:px-8 pb-5">
                <Segmented<View>
                    ariaLabel="Visualização"
                    value={view}
                    onChange={changeView}
                    className="w-full sm:w-auto"
                    options={[
                        { value: 'today', label: 'Hoje', badge: counts.today },
                        { value: 'upcoming', label: 'Próximos' },
                        { value: 'someday', label: 'Algum dia', badge: counts.someday },
                        { value: 'matrix', label: 'Prioridades' },
                        { value: 'routines', label: 'Rotinas' },
                        { value: 'done', label: 'Concluídas' },
                    ]}
                />
            </div>

            <div className="sm:px-6 lg:px-8">
                {error ? (
                    <ErrorState migration={error.code === 'MIGRATION_MISSING'} message={error.message} onRetry={ctl.refresh} />
                ) : loading || !data ? (
                    <SkeletonList />
                ) : view === 'today' ? (
                    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 items-start">
                        <div className="space-y-6">
                            {needsPlanning && (
                                <button
                                    type="button"
                                    onClick={() => setPlanning(true)}
                                    className="w-full text-left bg-card sm:rounded-2xl border-y sm:border border-border/60 px-4 py-4 flex items-center gap-4 hover:border-primary/40 transition-colors"
                                >
                                    <span className="w-11 h-11 rounded-full bg-orange-500/12 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0"><Sunrise className="w-5 h-5" /></span>
                                    <span className="flex-1 min-w-0">
                                        <span className="block type-headline text-foreground">Planeje seu dia em 2 minutos</span>
                                        <span className="block text-[13px] text-muted-foreground">Decida o que fica para hoje e o que pode esperar.</span>
                                    </span>
                                    <span className="text-[15px] font-medium text-primary">Começar</span>
                                </button>
                            )}

                            <div className="px-4 sm:px-1">
                                <WorkloadBar planned={workload.planned} capacity={capacity} unestimated={workload.unestimated} />
                            </div>

                            <div className="lg:hidden px-4 sm:px-0">
                                <Segmented
                                    size="sm"
                                    ariaLabel="Modo de exibição"
                                    value={mobileMode}
                                    onChange={setMobileMode}
                                    options={[{ value: 'list', label: 'Lista' }, { value: 'timeline', label: 'Linha do tempo' }]}
                                />
                            </div>

                            {mobileMode === 'timeline' && (
                                <div className="lg:hidden bg-card sm:rounded-2xl border-y sm:border border-border/60 p-3">
                                    <Timeline tasks={todayTasks} alerts={todayAlerts} onOpen={setEditing} />
                                </div>
                            )}

                            <div className={cn('space-y-6', mobileMode === 'timeline' && 'hidden lg:block')}>
                                {overdue.length > 0 && (
                                    <Section title="Prazo vencido" accent="red" count={overdue.length}>
                                        {overdue.map(t => <TaskRow key={t.id} task={t} {...rowProps} showDate />)}
                                    </Section>
                                )}

                                <Section title="Tarefas" count={byPeriod.any.length}>
                                    <QuickAdd onSubmit={input => ctl.createTask(input)} defaultDate={today} />
                                    {byPeriod.any.map(t => <TaskRow key={t.id} task={t} {...rowProps} />)}
                                </Section>

                                {(['morning', 'afternoon', 'evening'] as DayPeriod[]).map(p => {
                                    const list = byPeriod[p]
                                    const routines = routinesToday.filter(r => r.day_period === p)
                                    if (list.length === 0 && routines.length === 0) return null
                                    return (
                                        <Section key={p} title={PERIOD_META[p].label} subtitle={PERIOD_META[p].range} count={list.length}>
                                            {routines.map(r => <RoutineCard key={r.id} routine={r} runs={data.runs} today={today} onToggle={ctl.toggleRoutineStep} />)}
                                            {list.map(t => <TaskRow key={t.id} task={t} {...rowProps} />)}
                                        </Section>
                                    )
                                })}

                                {todayAlerts.length > 0 && (
                                    <Section title="Dos outros módulos" subtitle="Pendências detectadas automaticamente" count={todayAlerts.length}>
                                        {todayAlerts.map(a => <AlertRow key={a.key} alert={a} {...alertProps} />)}
                                    </Section>
                                )}

                                {todayTasks.length === 0 && overdue.length === 0 && todayAlerts.length === 0 && routinesToday.length === 0 && (
                                    <div className="px-4 sm:px-1 py-6 text-center">
                                        <p className="type-title3 text-foreground">Tudo em dia</p>
                                        <p className="text-[15px] text-muted-foreground mt-1">Nada pendente para hoje. Adiante algo de Próximos ou aproveite a folga.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <aside className="hidden lg:block sticky top-24">
                            <div className="bg-card rounded-2xl border border-border/60 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <CalendarClock className="w-4 h-4 text-muted-foreground" />
                                    <h2 className="type-headline text-foreground">Linha do tempo</h2>
                                </div>
                                <div className="max-h-[70vh] overflow-y-auto pr-1 pt-2">
                                    <Timeline tasks={todayTasks} alerts={todayAlerts} onOpen={setEditing} />
                                </div>
                                <p className="mt-3 text-[13px] text-muted-foreground">Tarefas com horário e agendamentos da Mesa aparecem aqui.</p>
                            </div>
                        </aside>
                    </div>
                ) : view === 'upcoming' ? (
                    <UpcomingView
                        today={today}
                        tasks={tasks}
                        alerts={alerts}
                        routines={data.routines}
                        rowProps={rowProps}
                        alertProps={alertProps}
                        onCreate={input => ctl.createTask(input)}
                    />
                ) : view === 'someday' ? (
                    <div className="space-y-4">
                        <p className="px-4 sm:px-1 text-[15px] text-muted-foreground max-w-2xl">
                            Ideias e tarefas sem data. Elas não aparecem em Hoje até você escolher um dia.
                        </p>
                        <Section count={somedayTasks.length}>
                            <QuickAdd onSubmit={input => ctl.createTask(input)} defaultDate={null} placeholder="Anotar uma ideia ou tarefa sem data" />
                            {somedayTasks.map(t => <TaskRow key={t.id} task={t} {...rowProps} />)}
                            {somedayTasks.length === 0 && <EmptyRow>Nada guardado para depois.</EmptyRow>}
                        </Section>
                    </div>
                ) : view === 'matrix' ? (
                    <MatrixView tasks={tasks} today={today} onComplete={ctl.completeTask} onOpen={setEditing} />
                ) : view === 'routines' ? (
                    <RoutinesView routines={data.routines} runs={data.runs} today={today} onSave={ctl.saveRoutine} onDelete={ctl.deleteRoutine} />
                ) : (
                    <DoneView />
                )}
            </div>

            {/* Floating add button on phones (TickTick) */}
            <button
                type="button"
                onClick={openQuickAdd}
                aria-label="Nova tarefa"
                className="sm:hidden fixed right-4 z-30 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center active:scale-95 transition-transform"
                style={{ bottom: 'max(1.25rem, calc(env(safe-area-inset-bottom) + 0.75rem))' }}
            >
                <Plus className="w-6 h-6" strokeWidth={2.5} />
            </button>

            <TaskEditor
                open={!!editing || !!creating}
                task={editing}
                draft={creating ?? undefined}
                today={today}
                onClose={closeEditor}
                onSave={saveFromEditor}
                onDelete={t => { closeEditor(); ctl.deleteTask(t) }}
                onComplete={t => { closeEditor(); ctl.completeTask(t) }}
            />

            {data && (
                <PlanDaySheet
                    open={planning}
                    onClose={() => setPlanning(false)}
                    today={today}
                    tasks={tasks}
                    alerts={alerts}
                    capacityMinutes={capacity}
                    onCapacityChange={m => { setCapacity(m); writeStorage('tarefas:capacity', String(m)) }}
                    onConfirm={confirmPlan}
                />
            )}
        </div>
    )
}

interface UpcomingProps {
    today: string
    tasks: Task[]
    alerts: TaskAlert[]
    routines: NonNullable<ReturnType<typeof useTasks>['data']>['routines']
    rowProps: { today: string; onComplete: (t: Task) => void; onOpen: (t: Task) => void }
    alertProps: Omit<React.ComponentProps<typeof AlertRow>, 'alert'>
    onCreate: (input: TaskInput) => Promise<unknown>
}

function UpcomingView({ today, tasks, alerts, routines, rowProps, alertProps, onCreate }: UpcomingProps) {
    const days = Array.from({ length: 7 }, (_, i) => addDays(today, i + 1))
    const later = tasks.filter(t => t.do_date && t.do_date > days[days.length - 1])
    const laterGroups = new Map<string, Task[]>()
    for (const t of later) laterGroups.set(t.do_date!, [...(laterGroups.get(t.do_date!) ?? []), t])

    return (
        <div className="space-y-6">
            {days.map((d, i) => {
                const dayTasks = tasks.filter(t => t.do_date === d)
                const dayAlerts = alerts.filter(a => a.date === d)
                const dayRoutines = routines.filter(r => r.is_active && r.weekdays.includes(weekdayOf(d)))
                return (
                    <Section
                        key={d}
                        title={relativeDayLabel(d, today)}
                        subtitle={`${longDayLabel(d)}${dayRoutines.length ? ` · Rotinas: ${dayRoutines.map(r => r.name).join(', ')}` : ''}`}
                        count={dayTasks.length + dayAlerts.length}
                    >
                        {i === 0 && <QuickAdd onSubmit={onCreate} defaultDate={d} placeholder="Adicionar para amanhã" />}
                        {dayTasks.map(t => <TaskRow key={t.id} task={t} {...rowProps} />)}
                        {dayAlerts.map(a => <AlertRow key={a.key} alert={a} {...alertProps} />)}
                        {i > 0 && dayTasks.length === 0 && dayAlerts.length === 0 && <EmptyRow>Livre</EmptyRow>}
                    </Section>
                )
            })}
            {laterGroups.size > 0 && (
                <Section title="Mais adiante" count={later.length}>
                    {[...laterGroups.values()].flat().map(t => <TaskRow key={t.id} task={t} {...rowProps} showDate />)}
                </Section>
            )}
        </div>
    )
}

function ErrorState({ migration, message, onRetry }: { migration: boolean; message: string; onRetry: () => void }) {
    return (
        <div className="mx-4 sm:mx-0 bg-card rounded-2xl border border-border/60 p-6 flex flex-col items-center text-center gap-3">
            <span className="w-12 h-12 rounded-full bg-orange-500/12 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                <Database className="w-6 h-6" />
            </span>
            <p className="type-headline text-foreground">{migration ? 'Falta ativar o módulo no banco de dados' : 'Não foi possível carregar suas tarefas'}</p>
            <p className="text-[15px] text-muted-foreground max-w-md">
                {migration
                    ? 'Rode o arquivo supabase/migrations/20260924_tasks_module.sql no SQL Editor do Supabase e recarregue esta página.'
                    : message}
            </p>
            <button type="button" onClick={onRetry} className="h-10 px-4 rounded-full bg-primary/12 text-primary text-[15px] font-medium inline-flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Tentar de novo
            </button>
        </div>
    )
}
