'use client'

import { cn } from '@/lib/utils'
import TaskRow from './TaskRow'
import type { Task } from '@/lib/tasks/types'
import { diffDays } from '@/lib/tasks/dates'

interface MatrixViewProps {
    tasks: Task[]
    today: string
    onComplete: (task: Task) => void
    onOpen: (task: Task) => void
}

/**
 * Eisenhower matrix (TickTick). Urgency comes from dates, importance from
 * priority, so tasks sort themselves without extra fields:
 *   urgent    = priority "Urgente", or deadline/do-date within 2 days
 *   important = priority "Urgente" or "Alta"
 */
export function quadrantOf(task: Task, today: string): 0 | 1 | 2 | 3 {
    const soon = (d: string | null) => !!d && diffDays(today, d) <= 2
    const urgent = task.priority === 1 || soon(task.deadline) || (task.do_date !== null && task.do_date <= today)
    const important = task.priority <= 2
    if (urgent && important) return 0
    if (!urgent && important) return 1
    if (urgent && !important) return 2
    return 3
}

const QUADRANTS = [
    { title: 'Fazer agora', hint: 'Urgente e importante', tone: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' },
    { title: 'Agendar', hint: 'Importante, sem pressa', tone: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
    { title: 'Resolver rápido ou delegar', hint: 'Urgente, pouco importante', tone: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },
    { title: 'Talvez depois', hint: 'Nem urgente, nem importante', tone: 'text-muted-foreground', dot: 'bg-zinc-400' },
]

export default function MatrixView({ tasks, today, onComplete, onOpen }: MatrixViewProps) {
    const groups: Task[][] = [[], [], [], []]
    for (const t of tasks) groups[quadrantOf(t, today)].push(t)

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {QUADRANTS.map((q, i) => (
                <section key={q.title} className="bg-card sm:rounded-2xl border-y sm:border border-border/60 flex flex-col min-h-[200px]">
                    <header className="px-4 pt-3 pb-2 flex items-center gap-2">
                        <span className={cn('w-2.5 h-2.5 rounded-full', q.dot)} />
                        <div className="flex-1 min-w-0">
                            <h2 className={cn('type-headline', q.tone)}>{q.title}</h2>
                            <p className="text-[13px] text-muted-foreground">{q.hint}</p>
                        </div>
                        <span className="text-[15px] text-muted-foreground tabular-nums">{groups[i].length}</span>
                    </header>
                    <div className="flex-1 max-h-[360px] overflow-y-auto border-t border-border/60">
                        {groups[i].length === 0 ? (
                            <p className="px-4 py-6 text-[15px] text-muted-foreground text-center">Nada aqui.</p>
                        ) : groups[i].map(t => (
                            <TaskRow key={t.id} task={t} today={today} onComplete={onComplete} onOpen={onOpen} showDate compact />
                        ))}
                    </div>
                </section>
            ))}
        </div>
    )
}
