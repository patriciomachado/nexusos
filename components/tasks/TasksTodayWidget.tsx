'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ChevronRight, Plus, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTaskStore } from '@/store/taskStore'
import { ModuleTile } from './AlertRow'
import { openQuickAdd } from './QuickAddDialog'
import { PRIORITY_META, type TaskPriority } from '@/lib/tasks/types'

/** "Seu dia" card on the admin dashboard. */
export default function TasksTodayWidget() {
    const summary = useTaskStore(s => s.summary)
    const fetchSummary = useTaskStore(s => s.fetchSummary)

    useEffect(() => {
        fetchSummary(true)
        const onChanged = () => fetchSummary(true)
        window.addEventListener('tasks:changed', onChanged)
        return () => window.removeEventListener('tasks:changed', onChanged)
    }, [fetchSummary])

    if (!summary) return null

    const items = summary.top ?? []
    return (
        <section className="bg-card rounded-3xl border border-border/60 overflow-hidden" aria-labelledby="your-day">
            <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
                <div>
                    <h2 id="your-day" className="type-headline text-foreground">Seu dia</h2>
                    <p className="text-[13px] text-muted-foreground">
                        {summary.total === 0
                            ? 'Nada pendente para hoje'
                            : `${summary.today} ${summary.today === 1 ? 'tarefa' : 'tarefas'} · ${summary.alerts} ${summary.alerts === 1 ? 'aviso' : 'avisos'} dos módulos`}
                        {summary.overdue > 0 && <span className="text-red-600 dark:text-red-400"> · {summary.overdue} com prazo vencido</span>}
                    </p>
                </div>
                <div className="flex items-center gap-1">
                    <button type="button" onClick={openQuickAdd} aria-label="Nova tarefa" className="w-9 h-9 rounded-full bg-primary/12 text-primary flex items-center justify-center hover:bg-primary/18">
                        <Plus className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                    <Link href="/tarefas" className="h-9 px-3 rounded-full text-[15px] text-primary inline-flex items-center gap-0.5 hover:bg-foreground/[0.05]">
                        Abrir <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
            {items.length > 0 && (
                <ul className="border-t border-border/60">
                    {items.slice(0, 6).map((item, i) => (
                        <li key={item.id} className="relative">
                            {i > 0 && <div className="absolute left-[52px] right-0 top-0 h-px bg-border/60" aria-hidden />}
                            <Link
                                href={item.kind === 'task' ? `/tarefas?task=${item.id}` : item.href}
                                className="flex items-center gap-3 px-5 py-3 hover:bg-foreground/[0.03]"
                            >
                                {item.kind === 'task' ? (
                                    <span className={cn('w-[18px] h-[18px] ml-[5px] mr-[5px] rounded-full border-[1.75px] shrink-0', PRIORITY_META[item.priority as TaskPriority].ring)} aria-hidden />
                                ) : (
                                    <ModuleTile module={item.module} />
                                )}
                                <span className="flex-1 min-w-0">
                                    <span className="block text-[15px] text-foreground truncate">{item.title}</span>
                                    {item.kind === 'alert' && <span className="block text-[13px] text-muted-foreground truncate">{item.detail}</span>}
                                    {item.kind === 'task' && item.overdue && <span className="block text-[13px] text-red-600 dark:text-red-400">Prazo vencido</span>}
                                </span>
                                {item.kind === 'task' && item.time && (
                                    <span className="text-[13px] text-muted-foreground tabular-nums inline-flex items-center gap-1"><Clock className="w-3 h-3" />{item.time}</span>
                                )}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}
