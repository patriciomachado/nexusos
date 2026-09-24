import { z } from 'zod'

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida')
const timeStr = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Horário inválido')

export const subtaskSchema = z.object({
    id: z.string().min(1).max(64),
    title: z.string().trim().min(1).max(200),
    done: z.boolean(),
})

export const recurrenceSchema = z.object({
    freq: z.enum(['daily', 'weekly', 'monthly']),
    interval: z.number().int().min(1).max(12),
    weekdays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
    day_of_month: z.number().int().min(1).max(31).optional(),
})

const taskFields = {
    title: z.string().trim().min(1, 'Informe um título').max(300),
    notes: z.string().max(5000).nullable().optional(),
    priority: z.number().int().min(1).max(4).optional(),
    do_date: dateStr.nullable().optional(),
    day_period: z.enum(['morning', 'afternoon', 'evening']).nullable().optional(),
    do_time: timeStr.nullable().optional(),
    duration_minutes: z.number().int().min(1).max(1440).nullable().optional(),
    deadline: dateStr.nullable().optional(),
    subtasks: z.array(subtaskSchema).max(50).optional(),
    recurrence: recurrenceSchema.nullable().optional(),
    /** Absolute reminder times (ISO 8601). Replaces all pending reminders. */
    reminders: z.array(z.string().datetime({ offset: true })).max(10).optional(),
}

export const createTaskSchema = z.object({
    ...taskFields,
    source_key: z.string().max(200).nullable().optional(),
    // Internal paths only ("/x", never "//host" or a full URL).
    source_href: z.string().max(500).regex(/^\/(?![/\\])/, 'Link interno inválido').nullable().optional(),
})

export const updateTaskSchema = z.object({
    ...taskFields,
    title: taskFields.title.optional(),
    status: z.enum(['open', 'done']).optional(),
}).strict()

export const batchUpdateSchema = z.object({
    ids: z.array(z.string().uuid()).min(1).max(200),
    patch: z.object({
        do_date: dateStr.nullable().optional(),
        day_period: z.enum(['morning', 'afternoon', 'evening']).nullable().optional(),
        priority: z.number().int().min(1).max(4).optional(),
    }).strict(),
})

export const alertActionSchema = z.object({
    key: z.string().min(1).max(200),
    action: z.enum(['snooze', 'dismiss', 'restore']),
    until: dateStr.optional(),
})

export const routineSchema = z.object({
    name: z.string().trim().min(1, 'Informe um nome').max(120),
    weekdays: z.array(z.number().int().min(0).max(6)).min(1, 'Escolha ao menos um dia').max(7),
    day_period: z.enum(['morning', 'afternoon', 'evening']),
    remind_time: timeStr.nullable().optional(),
    steps: z.array(z.object({ id: z.string().min(1).max(64), title: z.string().trim().min(1).max(200) })).min(1, 'Adicione ao menos um passo').max(40),
    is_active: z.boolean().optional(),
})

export const routineRunSchema = z.object({
    date: dateStr,
    step_id: z.string().min(1).max(64),
    done: z.boolean(),
})

/** Browser push services; the server only ever sends to these hosts. */
const PUSH_HOSTS = [
    /^fcm\.googleapis\.com$/,
    /^android\.googleapis\.com$/,
    /^updates\.push\.services\.mozilla\.com$/,
    /^web\.push\.apple\.com$/,
    /\.push\.apple\.com$/,
    /\.notify\.windows\.com$/,
]

export function isAllowedPushEndpoint(endpoint: string) {
    try {
        const url = new URL(endpoint)
        return url.protocol === 'https:' && PUSH_HOSTS.some(re => re.test(url.hostname))
    } catch {
        return false
    }
}

export const pushSubscriptionSchema = z.object({
    endpoint: z.string().url().max(1000).refine(isAllowedPushEndpoint, 'Serviço de notificação não suportado'),
    keys: z.object({
        p256dh: z.string().min(1).max(500),
        auth: z.string().min(1).max(200),
    }),
})

export function firstError(error: z.ZodError): string {
    return error.issues[0]?.message || 'Dados inválidos'
}
