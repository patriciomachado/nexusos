'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Repeat, Bell, Flag, ListTodo, StickyNote, CornerUpRight, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PRIORITY_META, type Task } from '@/lib/tasks/types'
import { relativeDayLabel, diffDays } from '@/lib/tasks/dates'
import { describeRecurrence } from '@/lib/tasks/recurrence'
import { formatDuration } from '@/lib/tasks/parse'

interface TaskRowProps {
    task: Task
    today: string
    onComplete: (task: Task) => void
    onOpen: (task: Task) => void
    /** Show the do-date (in lists that span several days). */
    showDate?: boolean
    compact?: boolean
}

export function TaskCheckbox({ priority, checked, onToggle, label }: { priority: Task['priority']; checked: boolean; onToggle: () => void; label: string }) {
    const meta = PRIORITY_META[priority]
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            aria-label={label}
            onClick={(e) => { e.stopPropagation(); onToggle() }}
            className="w-11 h-11 -m-2.5 flex items-center justify-center shrink-0 group/check"
        >
            <span className={cn(
                'w-[22px] h-[22px] rounded-full border-[1.75px] flex items-center justify-center transition duration-200',
                checked ? `${meta.color} border-transparent scale-95` : cn(meta.ring, priority === 1 ? 'bg-red-500/10' : priority === 2 ? 'bg-orange-500/10' : 'group-hover/check:bg-foreground/[0.04]')
            )}>
                <Check className={cn('w-3.5 h-3.5 text-white transition-opacity', checked ? 'opacity-100' : 'opacity-0')} strokeWidth={3} />
            </span>
        </button>
    )
}

export default function TaskRow({ task, today, onComplete, onOpen, showDate, compact }: TaskRowProps) {
    const [checking, setChecking] = useState(false)
    const subtasksDone = task.subtasks.filter(s => s.done).length
    const pendingReminders = (task.task_reminders ?? []).filter(r => !r.sent_at).length
    const overdue = !!task.deadline && task.deadline < today
    const deadlineSoon = !!task.deadline && !overdue && diffDays(today, task.deadline) <= 2

    const complete = () => {
        setChecking(true)
        // Let the check animation play before the row leaves the list.
        setTimeout(() => onComplete(task), 280)
    }

    const meta: React.ReactNode[] = []
    if (showDate && task.do_date) meta.push(<span key="date" className={cn(task.do_date < today && 'text-red-600 dark:text-red-400')}>{relativeDayLabel(task.do_date, today)}</span>)
    if (task.do_time) meta.push(<span key="time" className="inline-flex items-center gap-1 tabular-nums"><Clock className="w-3 h-3" />{task.do_time.slice(0, 5)}</span>)
    if (task.duration_minutes) meta.push(<span key="dur">{formatDuration(task.duration_minutes)}</span>)
    if (task.deadline) meta.push(
        <span key="deadline" className={cn('inline-flex items-center gap-1', overdue ? 'text-red-600 dark:text-red-400 font-medium' : deadlineSoon ? 'text-orange-600 dark:text-orange-400' : '')}>
            <Flag className="w-3 h-3" />
            {overdue ? `Prazo vencido (${relativeDayLabel(task.deadline, today).toLowerCase()})` : `Prazo ${relativeDayLabel(task.deadline, today).toLowerCase()}`}
        </span>
    )
    if (task.recurrence) meta.push(<span key="rec" className="inline-flex items-center gap-1"><Repeat className="w-3 h-3" />{describeRecurrence(task.recurrence)}</span>)
    if (task.subtasks.length) meta.push(<span key="sub" className="inline-flex items-center gap-1 tabular-nums"><ListTodo className="w-3 h-3" />{subtasksDone}/{task.subtasks.length}</span>)
    if (pendingReminders) meta.push(<Bell key="rem" className="w-3 h-3" aria-label="Com lembrete" />)
    if (task.notes && !task.source_key) meta.push(<StickyNote key="notes" className="w-3 h-3" aria-label="Com anotações" />)
    if (task.rollover_count > 0) meta.push(
        <span key="roll" className={cn(task.rollover_count >= 3 ? 'text-orange-600 dark:text-orange-400 font-medium' : '')}>
            {task.rollover_count === 1 ? 'Adiada 1 vez' : `Adiada ${task.rollover_count} vezes`}
        </span>
    )

    return (
        <div
            className={cn(
                'group relative flex items-start gap-3 px-4 transition-[opacity,transform] duration-300',
                compact ? 'py-2.5' : 'py-3',
                checking && 'opacity-40'
            )}
        >
            <div className="pt-0.5">
                <TaskCheckbox
                    priority={task.priority}
                    checked={checking}
                    onToggle={complete}
                    label={`Concluir “${task.title}”`}
                />
            </div>
            <button
                type="button"
                onClick={() => onOpen(task)}
                className="flex-1 min-w-0 text-left -my-1 py-1 rounded-md focus-visible:outline-offset-4"
            >
                <span className={cn('block text-[15px] leading-snug text-foreground break-words', checking && 'line-through text-muted-foreground')}>
                    {task.priority === 1 && <span className="text-red-600 dark:text-red-400 font-semibold mr-1" aria-label="Urgente">!!</span>}
                    {task.priority === 2 && <span className="text-orange-600 dark:text-orange-400 font-semibold mr-1" aria-label="Prioridade alta">!</span>}
                    {task.title}
                </span>
                {meta.length > 0 && (
                    <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-muted-foreground">
                        {meta}
                    </span>
                )}
            </button>
            {task.source_href && (
                <Link
                    href={task.source_href}
                    className="shrink-0 w-9 h-9 -my-1 -mr-2 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-foreground/[0.05] transition-colors"
                    aria-label="Abrir no módulo de origem"
                    title="Abrir no módulo de origem"
                >
                    <CornerUpRight className="w-4 h-4" />
                </Link>
            )}
        </div>
    )
}
