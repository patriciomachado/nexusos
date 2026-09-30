'use client'

import { localDateString } from '@/lib/tasks/dates'
import type { Task, TasksPayload, Routine, RoutineRun } from '@/lib/tasks/types'

export class ApiError extends Error {
    constructor(message: string, public status: number, public code?: string) {
        super(message)
    }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
        ...init,
        headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
        cache: 'no-store',
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
        const message = data?.error || 'Algo deu errado. Tente de novo.'
        throw new ApiError(data?.detail ? `${message} Detalhe: ${data.detail}` : message, res.status, data?.code)
    }
    return data as T
}

const today = () => localDateString()

/** Tell every mounted view (page, badge, widget) that tasks changed. */
export function emitTasksChanged() {
    window.dispatchEvent(new CustomEvent('tasks:changed'))
}

export type TaskInput = Partial<Pick<Task,
    'title' | 'notes' | 'priority' | 'do_date' | 'day_period' | 'do_time' | 'duration_minutes' | 'deadline' | 'subtasks' | 'recurrence' | 'status'
>> & { reminders?: string[]; source_key?: string | null; source_href?: string | null }

export const tasksApi = {
    list: () => request<TasksPayload>(`/api/tasks?today=${today()}`),
    done: () => request<{ today: string; tasks: Task[] }>(`/api/tasks?view=done&today=${today()}`),
    create: (input: TaskInput) => request<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(input) }),
    update: (id: string, input: TaskInput) =>
        request<{ task: Task; next: Task | null }>(`/api/tasks/${id}?today=${today()}`, { method: 'PATCH', body: JSON.stringify(input) }),
    remove: (id: string) => request<{ success: true }>(`/api/tasks/${id}`, { method: 'DELETE' }),
    batch: (ids: string[], patch: Pick<TaskInput, 'do_date' | 'day_period' | 'priority'>) =>
        request<{ updated: number }>('/api/tasks/batch', { method: 'POST', body: JSON.stringify({ ids, patch }) }),
    alert: (key: string, action: 'snooze' | 'dismiss' | 'restore', until?: string) =>
        request<{ ok: true }>('/api/tasks/alerts', { method: 'POST', body: JSON.stringify({ key, action, until }) }),
    createRoutine: (input: Omit<Routine, 'id' | 'position' | 'is_active'> & { is_active?: boolean }) =>
        request<Routine>('/api/tasks/routines', { method: 'POST', body: JSON.stringify(input) }),
    updateRoutine: (id: string, input: Partial<Omit<Routine, 'id' | 'position'>>) =>
        request<Routine>(`/api/tasks/routines/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    removeRoutine: (id: string) => request<{ success: true }>(`/api/tasks/routines/${id}`, { method: 'DELETE' }),
    toggleRoutineStep: (id: string, date: string, step_id: string, done: boolean) =>
        request<RoutineRun>(`/api/tasks/routines/${id}/run`, { method: 'POST', body: JSON.stringify({ date, step_id, done }) }),
    dueReminders: () => request<{ reminders: { task_id: string; title: string; body: string; url: string }[] }>('/api/tasks/reminders/due', { method: 'POST' }),
}

export function newId() {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID().slice(0, 8)
        : Math.random().toString(36).slice(2, 10)
}
