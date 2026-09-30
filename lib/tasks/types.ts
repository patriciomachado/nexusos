export type TaskPriority = 1 | 2 | 3 | 4
export type DayPeriod = 'morning' | 'afternoon' | 'evening'
export type TaskStatus = 'open' | 'done'

export interface Subtask {
    id: string
    title: string
    done: boolean
}

export interface Recurrence {
    freq: 'daily' | 'weekly' | 'monthly'
    interval: number
    /** 0 (domingo) … 6 (sábado), weekly only */
    weekdays?: number[]
    /** 1 … 31, monthly only */
    day_of_month?: number
}

export interface TaskReminder {
    id: string
    remind_at: string
    sent_at: string | null
}

export interface Task {
    id: string
    title: string
    notes: string | null
    priority: TaskPriority
    status: TaskStatus
    do_date: string | null
    day_period: DayPeriod | null
    do_time: string | null
    duration_minutes: number | null
    deadline: string | null
    subtasks: Subtask[]
    recurrence: Recurrence | null
    series_id: string | null
    rollover_count: number
    source_key: string | null
    source_href: string | null
    completed_at: string | null
    created_at: string
    updated_at: string
    task_reminders?: TaskReminder[]
}

export type AlertModule =
    | 'service_orders'
    | 'appointments'
    | 'inventory'
    | 'payments'
    | 'cash'
    | 'devices'
    | 'post_sales'
    | 'customers'

export type AlertSeverity = 'high' | 'medium' | 'low'

/** A pending item detected in another module. Never stored; computed on read. */
export interface TaskAlert {
    key: string
    module: AlertModule
    title: string
    detail: string
    href: string
    severity: AlertSeverity
    /** Day this alert belongs to (today, or a future day for "Próximos"). */
    date: string
    /** Optional time (HH:MM) for timeline placement. */
    time?: string
    /** Suggested task title when converting to a task. */
    suggestion: string
    /** Resolving is a one-off action (e.g. birthday greeted), not a data fix. */
    dismissible: boolean
}

export interface Routine {
    id: string
    name: string
    weekdays: number[]
    day_period: DayPeriod
    remind_time: string | null
    steps: { id: string; title: string }[]
    is_active: boolean
    position: number
}

export interface RoutineRun {
    id: string
    routine_id: string
    run_date: string
    completed_steps: string[]
    completed_at: string | null
}

export interface TasksPayload {
    today: string
    tasks: Task[]
    alerts: TaskAlert[]
    routines: Routine[]
    runs: RoutineRun[]
    rolledOver: number
}

export const PRIORITY_META: Record<TaskPriority, { label: string; short: string; color: string; ring: string; text: string }> = {
    1: { label: 'Urgente', short: 'P1', color: 'bg-red-500', ring: 'border-red-500', text: 'text-red-600 dark:text-red-400' },
    2: { label: 'Alta', short: 'P2', color: 'bg-orange-500', ring: 'border-orange-500', text: 'text-orange-600 dark:text-orange-400' },
    3: { label: 'Normal', short: 'P3', color: 'bg-blue-500', ring: 'border-muted-foreground/50', text: 'text-muted-foreground' },
    4: { label: 'Baixa', short: 'P4', color: 'bg-zinc-400', ring: 'border-muted-foreground/35', text: 'text-muted-foreground' },
}

export const PERIOD_META: Record<DayPeriod, { label: string; range: string }> = {
    morning: { label: 'Manhã', range: 'até 12h' },
    afternoon: { label: 'Tarde', range: '12h–18h' },
    evening: { label: 'Fim do dia', range: 'depois das 18h' },
}

export const MODULE_META: Record<AlertModule, { label: string; tint: string }> = {
    service_orders: { label: 'Ordens de Serviço', tint: 'bg-blue-500' },
    appointments: { label: 'Mesa / Fluxo', tint: 'bg-orange-500' },
    inventory: { label: 'Estoque', tint: 'bg-orange-500' },
    payments: { label: 'Recebimentos', tint: 'bg-green-500' },
    cash: { label: 'Caixa', tint: 'bg-green-500' },
    devices: { label: 'Aparelhos', tint: 'bg-cyan-500' },
    post_sales: { label: 'Pós-Venda', tint: 'bg-pink-500' },
    customers: { label: 'Clientes', tint: 'bg-purple-500' },
}

/** Period a HH:MM time falls in. */
export function periodOfTime(time: string | null | undefined): DayPeriod | null {
    if (!time) return null
    const h = +time.slice(0, 2)
    if (h < 12) return 'morning'
    if (h < 18) return 'afternoon'
    return 'evening'
}
