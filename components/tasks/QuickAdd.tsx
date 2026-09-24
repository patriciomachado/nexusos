'use client'

import { forwardRef, useMemo, useState } from 'react'
import { Plus, CalendarDays, Clock, Flag, Repeat, Timer, Sun, AlertCircle, CornerDownLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseQuickAdd, type ParsedTask } from '@/lib/tasks/parse'
import { localDateString } from '@/lib/tasks/dates'
import type { TaskInput } from './api'

const CHIP_ICON = {
    date: CalendarDays,
    time: Clock,
    period: Sun,
    deadline: Flag,
    priority: AlertCircle,
    recurrence: Repeat,
    duration: Timer,
} as const

export function parsedToInput(parsed: ParsedTask, defaults: Partial<TaskInput> = {}): TaskInput {
    return {
        title: parsed.title,
        do_date: parsed.do_date ?? (defaults.do_date !== undefined ? defaults.do_date : null),
        do_time: parsed.do_time ?? null,
        day_period: parsed.day_period ?? null,
        deadline: parsed.deadline ?? null,
        priority: parsed.priority ?? defaults.priority ?? 3,
        recurrence: parsed.recurrence ?? null,
        duration_minutes: parsed.duration_minutes ?? null,
    }
}

export function ParsedChips({ parsed, className }: { parsed: ParsedTask; className?: string }) {
    if (parsed.chips.length === 0) return null
    return (
        <div className={cn('flex flex-wrap gap-1.5', className)} aria-live="polite">
            {parsed.chips.map((chip, i) => {
                const Icon = CHIP_ICON[chip.kind]
                return (
                    <span
                        key={i}
                        className={cn(
                            'inline-flex items-center gap-1 h-6 px-2 rounded-full text-xs font-medium',
                            chip.kind === 'deadline' ? 'bg-orange-500/12 text-orange-700 dark:text-orange-300'
                                : chip.kind === 'priority' ? 'bg-red-500/12 text-red-700 dark:text-red-300'
                                    : 'bg-primary/10 text-primary'
                        )}
                    >
                        <Icon className="w-3 h-3" />
                        {chip.label}
                    </span>
                )
            })}
        </div>
    )
}

interface QuickAddProps {
    onSubmit: (input: TaskInput) => Promise<unknown>
    /** Date given to tasks typed without one (null = "Algum dia"). */
    defaultDate: string | null
    placeholder?: string
    className?: string
}

/** Inline quick-add row at the top of a list (Things / Todoist). */
const QuickAdd = forwardRef<HTMLInputElement, QuickAddProps>(function QuickAdd({ onSubmit, defaultDate, placeholder, className }, ref) {
    const [value, setValue] = useState('')
    const [busy, setBusy] = useState(false)
    const parsed = useMemo(() => parseQuickAdd(value, localDateString()), [value])

    const submit = async () => {
        if (!parsed.title || busy) return
        setBusy(true)
        await onSubmit(parsedToInput(parsed, { do_date: defaultDate }))
        setBusy(false)
        setValue('')
    }

    return (
        <div className={cn('px-4 py-2.5', className)}>
            <div className="flex items-center gap-3">
                <span className="w-[22px] h-[22px] rounded-full bg-primary/12 text-primary flex items-center justify-center shrink-0">
                    <Plus className="w-4 h-4" strokeWidth={2.5} />
                </span>
                <input
                    ref={ref}
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); submit() }
                        if (e.key === 'Escape') setValue('')
                    }}
                    placeholder={placeholder ?? 'Nova tarefa — ex.: ligar fornecedor amanhã 14h !alta'}
                    aria-label="Nova tarefa"
                    enterKeyHint="done"
                    className="flex-1 min-w-0 h-10 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                {value && (
                    <button
                        type="button"
                        onClick={submit}
                        disabled={!parsed.title || busy}
                        className="h-8 px-3 rounded-full bg-primary text-primary-foreground text-[13px] font-semibold disabled:opacity-40 inline-flex items-center gap-1.5 shrink-0"
                    >
                        Adicionar
                        <CornerDownLeft className="w-3.5 h-3.5 hidden sm:block" />
                    </button>
                )}
            </div>
            {value && <ParsedChips parsed={parsed} className="mt-1.5 pl-[34px]" />}
        </div>
    )
})

export default QuickAdd
