'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { tasksApi, emitTasksChanged, ApiError, type TaskInput } from './api'
import { useTaskStore } from '@/store/taskStore'
import { localDateString } from '@/lib/tasks/dates'
import type { Task, TaskAlert, TasksPayload, Routine } from '@/lib/tasks/types'

function sortTasks(tasks: Task[]) {
    return [...tasks].sort((a, b) =>
        (a.do_date ?? '9999').localeCompare(b.do_date ?? '9999') ||
        (a.do_time ?? '99').localeCompare(b.do_time ?? '99') ||
        a.priority - b.priority ||
        a.created_at.localeCompare(b.created_at)
    )
}

export function useTasks() {
    const [data, setData] = useState<TasksPayload | null>(null)
    const [error, setError] = useState<ApiError | null>(null)
    const [loading, setLoading] = useState(true)
    const refreshBadge = useTaskStore(s => s.fetchSummary)
    const dayRef = useRef(localDateString())

    const refresh = useCallback(async () => {
        try {
            const payload = await tasksApi.list()
            setData(payload)
            setError(null)
        } catch (e) {
            setError(e instanceof ApiError ? e : new ApiError('Não foi possível carregar suas tarefas.', 0))
        } finally {
            setLoading(false)
        }
    }, [])

    const afterChange = useCallback(() => {
        refreshBadge(true)
    }, [refreshBadge])

    useEffect(() => {
        refresh()
        const onChanged = () => refresh()
        const onFocus = () => {
            // New day while the tab was open: reload so rollover happens.
            if (localDateString() !== dayRef.current) dayRef.current = localDateString()
            refresh()
        }
        window.addEventListener('tasks:changed', onChanged)
        window.addEventListener('focus', onFocus)
        const id = setInterval(() => { if (document.visibilityState === 'visible') refresh() }, 5 * 60_000)
        return () => {
            window.removeEventListener('tasks:changed', onChanged)
            window.removeEventListener('focus', onFocus)
            clearInterval(id)
        }
    }, [refresh])

    const patchLocal = useCallback((fn: (d: TasksPayload) => TasksPayload) => {
        setData(d => (d ? fn(d) : d))
    }, [])

    const fail = (e: unknown) => {
        toast.error(e instanceof ApiError ? e.message : 'Algo deu errado. Tente de novo.')
        refresh()
    }

    const createTask = useCallback(async (input: TaskInput) => {
        try {
            const task = await tasksApi.create(input)
            patchLocal(d => ({ ...d, tasks: sortTasks([...d.tasks, task]) }))
            afterChange()
            return task
        } catch (e) {
            fail(e)
            return null
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patchLocal, afterChange])

    const updateTask = useCallback(async (id: string, input: TaskInput) => {
        patchLocal(d => ({ ...d, tasks: sortTasks(d.tasks.map(t => (t.id === id ? { ...t, ...input } as Task : t))) }))
        try {
            const { task } = await tasksApi.update(id, input)
            patchLocal(d => ({ ...d, tasks: sortTasks(d.tasks.map(t => (t.id === id ? task : t))) }))
            afterChange()
            return task
        } catch (e) {
            fail(e)
            return null
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patchLocal, afterChange])

    const completeTask = useCallback(async (task: Task) => {
        patchLocal(d => ({ ...d, tasks: d.tasks.filter(t => t.id !== task.id) }))
        try {
            const { next } = await tasksApi.update(task.id, { status: 'done' })
            if (next) patchLocal(d => ({ ...d, tasks: sortTasks([...d.tasks, next]) }))
            afterChange()
            toast.success('Tarefa concluída', {
                description: task.title,
                action: {
                    label: 'Desfazer',
                    onClick: async () => {
                        try {
                            if (next) await tasksApi.remove(next.id)
                            const { task: reopened } = await tasksApi.update(task.id, { status: 'open' })
                            patchLocal(d => ({ ...d, tasks: sortTasks([...d.tasks.filter(t => t.id !== next?.id), reopened]) }))
                            afterChange()
                            emitTasksChanged()
                        } catch (e) { fail(e) }
                    },
                },
            })
        } catch (e) {
            fail(e)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patchLocal, afterChange])

    const deleteTask = useCallback(async (task: Task) => {
        patchLocal(d => ({ ...d, tasks: d.tasks.filter(t => t.id !== task.id) }))
        try {
            await tasksApi.remove(task.id)
            afterChange()
            toast('Tarefa apagada', { description: task.title })
        } catch (e) {
            fail(e)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patchLocal, afterChange])

    const moveTasks = useCallback(async (ids: string[], do_date: string | null) => {
        if (ids.length === 0) return
        patchLocal(d => ({ ...d, tasks: sortTasks(d.tasks.map(t => (ids.includes(t.id) ? { ...t, do_date, rollover_count: 0 } : t))) }))
        try {
            await tasksApi.batch(ids, { do_date })
            afterChange()
        } catch (e) {
            fail(e)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patchLocal, afterChange])

    const alertAction = useCallback(async (alert: TaskAlert, action: 'snooze' | 'dismiss', until?: string) => {
        patchLocal(d => ({ ...d, alerts: d.alerts.filter(a => a.key !== alert.key) }))
        try {
            await tasksApi.alert(alert.key, action, until)
            afterChange()
            toast(action === 'dismiss' ? 'Marcado como resolvido' : 'Aviso adiado', {
                description: alert.title,
                action: {
                    label: 'Desfazer',
                    onClick: async () => {
                        try {
                            await tasksApi.alert(alert.key, 'restore')
                            refresh()
                            afterChange()
                        } catch (e) { fail(e) }
                    },
                },
            })
        } catch (e) {
            fail(e)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patchLocal, afterChange, refresh])

    const convertAlert = useCallback(async (alert: TaskAlert, do_date: string | null) => {
        patchLocal(d => ({ ...d, alerts: d.alerts.filter(a => a.key !== alert.key) }))
        const task = await createTask({
            title: alert.suggestion,
            notes: alert.detail,
            do_date,
            do_time: alert.time && do_date === alert.date ? alert.time : null,
            priority: alert.severity === 'high' ? 2 : 3,
            source_key: alert.key,
            source_href: alert.href,
        })
        if (task) toast.success('Adicionada às suas tarefas', { description: task.title })
        return task
    }, [patchLocal, createTask])

    const toggleRoutineStep = useCallback(async (routine: Routine, date: string, stepId: string, done: boolean) => {
        patchLocal(d => {
            const existing = d.runs.find(r => r.routine_id === routine.id && r.run_date === date)
            const steps = new Set(existing?.completed_steps ?? [])
            if (done) steps.add(stepId)
            else steps.delete(stepId)
            const run = {
                id: existing?.id ?? `tmp-${routine.id}-${date}`,
                routine_id: routine.id,
                run_date: date,
                completed_steps: [...steps],
                completed_at: steps.size === routine.steps.length ? new Date().toISOString() : null,
            }
            return { ...d, runs: [...d.runs.filter(r => r !== existing), run] }
        })
        try {
            const run = await tasksApi.toggleRoutineStep(routine.id, date, stepId, done)
            patchLocal(d => ({ ...d, runs: [...d.runs.filter(r => !(r.routine_id === routine.id && r.run_date === date)), run] }))
            if (run.completed_at && done) toast.success(`${routine.name} concluída`)
        } catch (e) {
            fail(e)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patchLocal])

    const saveRoutine = useCallback(async (routine: Partial<Routine> & Pick<Routine, 'name' | 'weekdays' | 'day_period' | 'steps' | 'remind_time'>) => {
        try {
            if (routine.id) {
                const saved = await tasksApi.updateRoutine(routine.id, routine)
                patchLocal(d => ({ ...d, routines: d.routines.map(r => (r.id === saved.id ? saved : r)) }))
            } else {
                const saved = await tasksApi.createRoutine(routine)
                patchLocal(d => ({ ...d, routines: [...d.routines, saved] }))
            }
            return true
        } catch (e) {
            fail(e)
            return false
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patchLocal])

    const deleteRoutine = useCallback(async (routine: Routine) => {
        patchLocal(d => ({ ...d, routines: d.routines.filter(r => r.id !== routine.id) }))
        try {
            await tasksApi.removeRoutine(routine.id)
            toast('Rotina apagada', { description: routine.name })
        } catch (e) {
            fail(e)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patchLocal])

    return {
        data, error, loading, refresh,
        createTask, updateTask, completeTask, deleteTask, moveTasks,
        alertAction, convertAlert,
        toggleRoutineStep, saveRoutine, deleteRoutine,
    }
}

export type TasksController = ReturnType<typeof useTasks>
