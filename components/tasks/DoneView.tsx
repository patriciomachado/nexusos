'use client'

import { useCallback, useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import Section from './Section'
import { tasksApi, emitTasksChanged, ApiError } from './api'
import { useTaskStore } from '@/store/taskStore'
import { relativeDayLabel, localDateString, addDays, weekdayOf } from '@/lib/tasks/dates'
import type { Task } from '@/lib/tasks/types'

/** Logbook of completed tasks (Things) with a small daily/weekly tally (Todoist Karma). */
export default function DoneView() {
    const [tasks, setTasks] = useState<Task[] | null>(null)
    const [error, setError] = useState('')
    const refreshBadge = useTaskStore(s => s.fetchSummary)

    const load = useCallback(async () => {
        try {
            const res = await tasksApi.done()
            setTasks(res.tasks)
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Não foi possível carregar.')
        }
    }, [])

    useEffect(() => { load() }, [load])

    const reopen = async (task: Task) => {
        setTasks(list => list?.filter(t => t.id !== task.id) ?? null)
        try {
            await tasksApi.update(task.id, { status: 'open' })
            emitTasksChanged()
            refreshBadge(true)
            toast('Tarefa reaberta', { description: task.title })
        } catch (e) {
            toast.error(e instanceof ApiError ? e.message : 'Não foi possível reabrir.')
            load()
        }
    }

    if (error) return <p className="px-4 text-[15px] text-red-600 dark:text-red-400">{error}</p>
    if (!tasks) return <SkeletonList />

    const today = localDateString()
    const dayOf = (iso: string) => localDateString(new Date(iso))
    const weekStart = addDays(today, -((weekdayOf(today) + 6) % 7))
    const doneToday = tasks.filter(t => t.completed_at && dayOf(t.completed_at) === today).length
    const doneWeek = tasks.filter(t => t.completed_at && dayOf(t.completed_at) >= weekStart).length

    const groups = new Map<string, Task[]>()
    for (const t of tasks) {
        const d = t.completed_at ? dayOf(t.completed_at) : today
        groups.set(d, [...(groups.get(d) ?? []), t])
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 px-4 sm:px-0">
                <Stat label="Concluídas hoje" value={doneToday} />
                <Stat label="Nesta semana" value={doneWeek} />
            </div>
            {tasks.length === 0 && (
                <p className="px-4 sm:px-1 text-[15px] text-muted-foreground">As tarefas concluídas nos últimos 60 dias aparecem aqui.</p>
            )}
            {[...groups.entries()].map(([day, list]) => (
                <Section key={day} title={relativeDayLabel(day, today)} count={list.length}>
                    {list.map(t => (
                        <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                            <span className="w-[22px] h-[22px] rounded-full bg-muted-foreground/40 flex items-center justify-center shrink-0" aria-hidden>
                                <svg viewBox="0 0 12 12" className="w-3 h-3 text-white"><path d="M2.5 6.5l2.2 2.2L9.5 3.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-[15px] text-muted-foreground line-through decoration-muted-foreground/50 truncate">{t.title}</p>
                                {t.completed_at && (
                                    <p className="text-[13px] text-muted-foreground tabular-nums">
                                        {new Date(t.completed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => reopen(t)}
                                className="h-9 px-3 rounded-full text-[13px] font-medium text-primary hover:bg-primary/10 inline-flex items-center gap-1.5"
                            >
                                <RotateCcw className="w-3.5 h-3.5" /> Reabrir
                            </button>
                        </div>
                    ))}
                </Section>
            ))}
        </div>
    )
}

function Stat({ label, value }: { label: string; value: number }) {
    return (
        <div className="bg-card rounded-2xl border border-border/60 px-4 py-3">
            <p className="text-[13px] text-muted-foreground">{label}</p>
            <p className="type-title1 text-foreground tabular-nums">{value}</p>
        </div>
    )
}

export function SkeletonList() {
    return (
        <div className="bg-card sm:rounded-2xl border-y sm:border border-border/60" aria-busy="true" aria-label="Carregando">
            {[0, 1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 px-4 py-4">
                    <span className="w-[22px] h-[22px] rounded-full bg-muted animate-pulse" />
                    <span className="h-3.5 rounded bg-muted animate-pulse" style={{ width: `${60 - i * 8}%` }} />
                </div>
            ))}
        </div>
    )
}
