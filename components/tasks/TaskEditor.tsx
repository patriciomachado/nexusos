'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Trash2, Plus, X, Bell, CornerUpRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import Sheet from './Sheet'
import Segmented from '@/components/ui/Segmented'
import PremiumConfirmDialog from '@/components/ui/PremiumConfirmDialog'
import { newId, type TaskInput } from './api'
import { PRIORITY_META, type Task, type TaskPriority, type DayPeriod, type Recurrence, type Subtask } from '@/lib/tasks/types'
import { addDays, weekdayOf, relativeDayLabel, WEEKDAYS } from '@/lib/tasks/dates'
import { describeRecurrence } from '@/lib/tasks/recurrence'

interface TaskEditorProps {
    open: boolean
    task: Task | null
    /** Prefill for new tasks. */
    draft?: Partial<TaskInput>
    today: string
    onClose: () => void
    onSave: (input: TaskInput, task: Task | null) => Promise<unknown>
    onDelete?: (task: Task) => void
    onComplete?: (task: Task) => void
}

type RepeatKind = 'none' | 'daily' | 'workdays' | 'weekly' | 'monthly'

function repeatKindOf(r: Recurrence | null | undefined): RepeatKind {
    if (!r) return 'none'
    if (r.freq === 'daily') return 'daily'
    if (r.freq === 'monthly') return 'monthly'
    const d = r.weekdays ?? []
    if (d.length === 5 && [1, 2, 3, 4, 5].every(x => d.includes(x))) return 'workdays'
    return 'weekly'
}

function toLocalInput(iso: string) {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function reminderLabel(iso: string, today: string, now: number) {
    const d = new Date(iso)
    const day = toLocalInput(iso).slice(0, 10)
    const time = toLocalInput(iso).slice(11, 16)
    return `${relativeDayLabel(day, today)}, ${time}${d.getTime() < now ? ' · já passou' : ''}`
}

function localDateTime(day: string, time: string) {
    return new Date(`${day}T${time}:00`)
}

const DURATIONS = [15, 30, 60, 120]

export default function TaskEditor({ open, task, draft, today, onClose, onSave, onDelete, onComplete }: TaskEditorProps) {
    const [title, setTitle] = useState('')
    const [notes, setNotes] = useState('')
    const [priority, setPriority] = useState<TaskPriority>(3)
    const [doDate, setDoDate] = useState<string | null>(today)
    const [period, setPeriod] = useState<DayPeriod | 'any'>('any')
    const [time, setTime] = useState('')
    const [duration, setDuration] = useState<number | null>(null)
    const [deadline, setDeadline] = useState('')
    const [repeat, setRepeat] = useState<RepeatKind>('none')
    const [weekdays, setWeekdays] = useState<number[]>([])
    const [subtasks, setSubtasks] = useState<Subtask[]>([])
    const [newSubtask, setNewSubtask] = useState('')
    const [reminders, setReminders] = useState<string[]>([])
    const [customReminder, setCustomReminder] = useState('')
    const [saving, setSaving] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [error, setError] = useState('')
    // Captured when the sheet opens; render must not read the clock.
    const [nowTs, setNowTs] = useState(0)

    useEffect(() => {
        if (!open) return
        const src: Partial<Task & TaskInput> = task ?? draft ?? {}
        // Reset the form each time the sheet opens.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setNowTs(Date.now())
        setTitle(src.title ?? '')
        setNotes(src.notes ?? '')
        setPriority((src.priority as TaskPriority) ?? 3)
        setDoDate(src.do_date !== undefined ? src.do_date ?? null : today)
        setPeriod(src.day_period ?? 'any')
        setTime(src.do_time?.slice(0, 5) ?? '')
        setDuration(src.duration_minutes ?? null)
        setDeadline(src.deadline ?? '')
        setRepeat(repeatKindOf(src.recurrence))
        setWeekdays(src.recurrence?.weekdays ?? [])
        setSubtasks(src.subtasks ?? [])
        setReminders(task ? (task.task_reminders ?? []).filter(r => !r.sent_at).map(r => r.remind_at) : draft?.reminders ?? [])
        setNewSubtask('')
        setCustomReminder('')
        setError('')
    }, [open, task, draft, today])

    const baseDay = doDate ?? today
    const nextMonday = addDays(today, ((8 - weekdayOf(today)) % 7) || 7)

    const buildRecurrence = (): Recurrence | null => {
        switch (repeat) {
            case 'daily': return { freq: 'daily', interval: 1 }
            case 'workdays': return { freq: 'weekly', interval: 1, weekdays: [1, 2, 3, 4, 5] }
            case 'weekly': return { freq: 'weekly', interval: 1, weekdays: weekdays.length ? weekdays : [weekdayOf(baseDay)] }
            case 'monthly': return { freq: 'monthly', interval: 1, day_of_month: +baseDay.slice(8, 10) }
            default: return null
        }
    }

    const reminderPresets = (() => {
        const presets: { label: string; at: Date }[] = []
        if (!doDate) return presets
        if (time) {
            const at = localDateTime(doDate, time)
            presets.push({ label: 'Na hora', at })
            presets.push({ label: '15 min antes', at: new Date(at.getTime() - 15 * 60_000) })
            presets.push({ label: '1 h antes', at: new Date(at.getTime() - 60 * 60_000) })
            presets.push({ label: '1 dia antes', at: new Date(at.getTime() - 24 * 60 * 60_000) })
        } else {
            presets.push({ label: 'No dia, 9h', at: localDateTime(doDate, '09:00') })
            presets.push({ label: 'Na véspera, 18h', at: localDateTime(addDays(doDate, -1), '18:00') })
        }
        return presets.filter(p => p.at.getTime() > nowTs - 60_000)
    })()

    const addReminder = (at: Date) => {
        const iso = at.toISOString()
        setReminders(r => (r.includes(iso) ? r : [...r, iso].sort()))
    }

    const addSubtask = () => {
        const t = newSubtask.trim()
        if (!t) return
        setSubtasks(s => [...s, { id: newId(), title: t, done: false }])
        setNewSubtask('')
    }

    const save = async () => {
        if (!title.trim()) {
            setError('Dê um título para a tarefa.')
            return
        }
        if (deadline && doDate && deadline < doDate) {
            setError('O prazo é antes do dia em que você planejou fazer a tarefa.')
            return
        }
        setSaving(true)
        const pendingSubtask = newSubtask.trim()
        await onSave({
            title: title.trim(),
            notes: notes.trim() || null,
            priority,
            do_date: doDate,
            day_period: period === 'any' ? null : period,
            do_time: time || null,
            duration_minutes: duration,
            deadline: deadline || null,
            recurrence: doDate ? buildRecurrence() : null,
            subtasks: pendingSubtask ? [...subtasks, { id: newId(), title: pendingSubtask, done: false }] : subtasks,
            reminders,
        }, task)
        setSaving(false)
    }

    const recurrencePreview = describeRecurrence(buildRecurrence())

    return (
        <>
            <Sheet
                open={open}
                onClose={onClose}
                title={task ? 'Editar tarefa' : 'Nova tarefa'}
                footer={
                    <>
                        {task && onDelete && (
                            <button
                                type="button"
                                onClick={() => setConfirmDelete(true)}
                                className="h-11 w-11 -ml-2 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 hover:bg-red-500/10"
                                aria-label="Apagar tarefa"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                        {task && onComplete && (
                            <button
                                type="button"
                                onClick={() => onComplete(task)}
                                className="h-11 px-3 rounded-xl text-[15px] font-medium text-primary hover:bg-primary/10 inline-flex items-center gap-1.5"
                            >
                                <Check className="w-4 h-4" /> Concluir
                            </button>
                        )}
                        <div className="flex-1" />
                        <button type="button" onClick={onClose} className="h-11 px-4 rounded-xl text-[15px] text-primary hover:bg-foreground/[0.05]">
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={save}
                            disabled={saving}
                            className="h-11 px-5 rounded-xl bg-primary text-primary-foreground text-[15px] font-semibold disabled:opacity-50"
                        >
                            {saving ? 'Salvando…' : task ? 'Salvar' : 'Adicionar'}
                        </button>
                    </>
                }
            >
                <div className="space-y-5">
                    {/* Title + notes */}
                    <div className="rounded-xl bg-foreground/[0.04] overflow-hidden">
                        <input
                            data-autofocus
                            value={title}
                            onChange={e => { setTitle(e.target.value); setError('') }}
                            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save() }}
                            placeholder="Título"
                            aria-label="Título"
                            className="w-full h-12 px-4 bg-transparent text-[17px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                        />
                        <div className="h-px bg-border/70 ml-4" />
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Anotações"
                            aria-label="Anotações"
                            rows={2}
                            className="w-full px-4 py-3 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
                        />
                    </div>
                    {error && <p role="alert" className="text-[13px] text-red-600 dark:text-red-400 -mt-2">{error}</p>}

                    {task?.source_href && (
                        <Link href={task.source_href} className="flex items-center gap-2 text-[15px] text-primary">
                            <CornerUpRight className="w-4 h-4" /> Abrir no módulo de origem
                        </Link>
                    )}

                    {/* When */}
                    <Field label="Quando">
                        <div className="flex flex-wrap gap-2">
                            <Chip active={doDate === today} onClick={() => setDoDate(today)}>Hoje</Chip>
                            <Chip active={doDate === addDays(today, 1)} onClick={() => setDoDate(addDays(today, 1))}>Amanhã</Chip>
                            <Chip active={doDate === nextMonday} onClick={() => setDoDate(nextMonday)}>Segunda</Chip>
                            <Chip active={doDate === null} onClick={() => { setDoDate(null); setRepeat('none') }}>Algum dia</Chip>
                            <input
                                type="date"
                                value={doDate ?? ''}
                                onChange={e => setDoDate(e.target.value || null)}
                                aria-label="Escolher data"
                                className="h-9 px-3 rounded-full bg-foreground/[0.05] text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                        </div>
                        {doDate && (
                            <div className="mt-3 space-y-3">
                                <Segmented
                                    size="sm"
                                    ariaLabel="Período do dia"
                                    value={period}
                                    onChange={setPeriod}
                                    options={[
                                        { value: 'any', label: 'Qualquer hora' },
                                        { value: 'morning', label: 'Manhã' },
                                        { value: 'afternoon', label: 'Tarde' },
                                        { value: 'evening', label: 'Fim do dia' },
                                    ]}
                                />
                                <div className="flex flex-wrap items-center gap-2">
                                    <label className="text-[13px] text-muted-foreground" htmlFor="task-time">Horário</label>
                                    <input
                                        id="task-time"
                                        type="time"
                                        value={time}
                                        onChange={e => setTime(e.target.value)}
                                        className="h-9 px-3 rounded-full bg-foreground/[0.05] text-[14px] text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40"
                                    />
                                    {time && <ClearButton label="Remover horário" onClick={() => setTime('')} />}
                                </div>
                            </div>
                        )}
                    </Field>

                    {/* Duration */}
                    {doDate && (
                        <Field label="Duração estimada" hint="Usada para avisar quando o dia estiver cheio demais.">
                            <div className="flex flex-wrap gap-2">
                                <Chip active={duration === null} onClick={() => setDuration(null)}>Sem estimativa</Chip>
                                {DURATIONS.map(d => (
                                    <Chip key={d} active={duration === d} onClick={() => setDuration(d)}>{d < 60 ? `${d} min` : `${d / 60} h`}</Chip>
                                ))}
                            </div>
                        </Field>
                    )}

                    {/* Deadline */}
                    <Field label="Prazo final" hint="Separado do dia de fazer: mostra o que está para vencer.">
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={deadline}
                                onChange={e => { setDeadline(e.target.value); setError('') }}
                                aria-label="Prazo final"
                                className="h-9 px-3 rounded-full bg-foreground/[0.05] text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                            {deadline && <ClearButton label="Remover prazo" onClick={() => setDeadline('')} />}
                        </div>
                    </Field>

                    {/* Priority */}
                    <Field label="Prioridade">
                        <div className="grid grid-cols-4 gap-2">
                            {([1, 2, 3, 4] as TaskPriority[]).map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPriority(p)}
                                    aria-pressed={priority === p}
                                    className={cn(
                                        'h-10 rounded-xl text-[14px] font-medium flex items-center justify-center gap-1.5 transition-colors',
                                        priority === p ? 'bg-foreground/[0.1] text-foreground ring-2 ring-primary/50' : 'bg-foreground/[0.04] text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    <span className={cn('w-2.5 h-2.5 rounded-full', PRIORITY_META[p].color)} />
                                    {PRIORITY_META[p].label}
                                </button>
                            ))}
                        </div>
                    </Field>

                    {/* Repeat */}
                    {doDate && (
                        <Field label="Repetir" hint={repeat !== 'none' ? `${recurrencePreview}. Ao concluir, a próxima já fica agendada.` : undefined}>
                            <div className="flex flex-wrap gap-2">
                                {([
                                    ['none', 'Não repetir'],
                                    ['daily', 'Todo dia'],
                                    ['workdays', 'Dias úteis'],
                                    ['weekly', 'Toda semana'],
                                    ['monthly', 'Todo mês'],
                                ] as [RepeatKind, string][]).map(([k, label]) => (
                                    <Chip key={k} active={repeat === k} onClick={() => {
                                        setRepeat(k)
                                        if (k === 'weekly' && weekdays.length === 0) setWeekdays([weekdayOf(baseDay)])
                                    }}>{label}</Chip>
                                ))}
                            </div>
                            {repeat === 'weekly' && (
                                <div className="mt-2 flex gap-1.5" role="group" aria-label="Dias da semana">
                                    {WEEKDAYS.map((name, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            aria-pressed={weekdays.includes(i)}
                                            aria-label={name}
                                            onClick={() => setWeekdays(w => (w.includes(i) ? w.filter(x => x !== i) : [...w, i].sort()))}
                                            className={cn(
                                                'w-9 h-9 rounded-full text-[13px] font-semibold transition-colors',
                                                weekdays.includes(i) ? 'bg-primary text-primary-foreground' : 'bg-foreground/[0.05] text-muted-foreground'
                                            )}
                                        >
                                            {name.charAt(0).toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </Field>
                    )}

                    {/* Reminders */}
                    <Field label="Lembretes">
                        {reminders.length > 0 && (
                            <ul className="mb-2 rounded-xl bg-foreground/[0.04] divide-y divide-border/60">
                                {reminders.map(r => (
                                    <li key={r} className="flex items-center gap-3 px-3 h-11">
                                        <Bell className="w-4 h-4 text-orange-500" />
                                        <span className={cn('flex-1 text-[15px]', new Date(r).getTime() < nowTs && 'text-muted-foreground')}>{reminderLabel(r, today, nowTs)}</span>
                                        <ClearButton label="Remover lembrete" onClick={() => setReminders(list => list.filter(x => x !== r))} />
                                    </li>
                                ))}
                            </ul>
                        )}
                        <div className="flex flex-wrap gap-2">
                            {reminderPresets.map(p => (
                                <Chip key={p.label} onClick={() => addReminder(p.at)}>
                                    <Plus className="w-3.5 h-3.5" />{p.label}
                                </Chip>
                            ))}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                            <input
                                type="datetime-local"
                                value={customReminder}
                                onChange={e => setCustomReminder(e.target.value)}
                                aria-label="Lembrete em data e hora específicas"
                                className="h-9 px-3 rounded-full bg-foreground/[0.05] text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                            <button
                                type="button"
                                disabled={!customReminder}
                                onClick={() => { addReminder(new Date(customReminder)); setCustomReminder('') }}
                                className="h-9 px-3 rounded-full text-[14px] font-medium text-primary disabled:opacity-40 hover:bg-primary/10"
                            >
                                Adicionar
                            </button>
                        </div>
                    </Field>

                    {/* Subtasks */}
                    <Field label="Subtarefas">
                        <ul className="rounded-xl bg-foreground/[0.04] divide-y divide-border/60">
                            {subtasks.map(s => (
                                <li key={s.id} className="flex items-center gap-3 px-3 min-h-11">
                                    <button
                                        type="button"
                                        role="checkbox"
                                        aria-checked={s.done}
                                        aria-label={`Concluir ${s.title}`}
                                        onClick={() => setSubtasks(list => list.map(x => (x.id === s.id ? { ...x, done: !x.done } : x)))}
                                        className={cn('w-5 h-5 rounded-md border-[1.75px] flex items-center justify-center shrink-0', s.done ? 'bg-primary border-primary' : 'border-muted-foreground/50')}
                                    >
                                        {s.done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                    </button>
                                    <input
                                        value={s.title}
                                        onChange={e => setSubtasks(list => list.map(x => (x.id === s.id ? { ...x, title: e.target.value } : x)))}
                                        aria-label="Subtarefa"
                                        className={cn('flex-1 min-w-0 h-11 bg-transparent text-[15px] focus:outline-none', s.done && 'line-through text-muted-foreground')}
                                    />
                                    <ClearButton label="Remover subtarefa" onClick={() => setSubtasks(list => list.filter(x => x.id !== s.id))} />
                                </li>
                            ))}
                            <li className="flex items-center gap-3 px-3 h-11">
                                <Plus className="w-5 h-5 text-muted-foreground" />
                                <input
                                    value={newSubtask}
                                    onChange={e => setNewSubtask(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubtask() } }}
                                    placeholder="Adicionar passo"
                                    aria-label="Nova subtarefa"
                                    className="flex-1 h-11 bg-transparent text-[15px] placeholder:text-muted-foreground focus:outline-none"
                                />
                            </li>
                        </ul>
                    </Field>
                </div>
            </Sheet>

            <PremiumConfirmDialog
                isOpen={confirmDelete}
                title="Apagar tarefa?"
                description={task?.recurrence ? 'Só esta ocorrência será apagada. Esta ação não pode ser desfeita.' : 'Esta ação não pode ser desfeita.'}
                confirmLabel="Apagar"
                onCancel={() => setConfirmDelete(false)}
                onConfirm={() => { setConfirmDelete(false); if (task && onDelete) onDelete(task) }}
            />
        </>
    )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <section>
            <h3 className="text-[13px] font-medium text-muted-foreground mb-2">{label}</h3>
            {children}
            {hint && <p className="mt-1.5 text-[13px] text-muted-foreground">{hint}</p>}
        </section>
    )
}

function Chip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cn(
                'h-9 px-3.5 rounded-full text-[14px] font-medium inline-flex items-center gap-1 transition-colors',
                active ? 'bg-primary text-primary-foreground' : 'bg-foreground/[0.05] text-foreground hover:bg-foreground/[0.09]'
            )}
        >
            {children}
        </button>
    )
}

function ClearButton({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-foreground/[0.07] shrink-0"
        >
            <X className="w-4 h-4" />
        </button>
    )
}
