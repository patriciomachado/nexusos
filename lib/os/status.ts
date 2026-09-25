/** Service order statuses and priorities: labels and colors shared by list, detail and forms. */
export interface StatusMeta { label: string; short: string; dot: string; pill: string }

export const OS_STATUS: Record<string, StatusMeta> = {
    aberta: { label: 'Aberta', short: 'Abertas', dot: 'bg-blue-500', pill: 'bg-blue-500/12 text-blue-700 dark:text-blue-300' },
    agendada: { label: 'Agendada', short: 'Agendadas', dot: 'bg-violet-500', pill: 'bg-violet-500/12 text-violet-700 dark:text-violet-300' },
    em_andamento: { label: 'Em andamento', short: 'Em andamento', dot: 'bg-amber-500', pill: 'bg-amber-500/15 text-amber-800 dark:text-amber-300' },
    aguardando_pecas: { label: 'Aguardando peças', short: 'Aguardando peças', dot: 'bg-orange-500', pill: 'bg-orange-500/12 text-orange-700 dark:text-orange-300' },
    concluida: { label: 'Concluída', short: 'Concluídas', dot: 'bg-emerald-500', pill: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300' },
    faturada: { label: 'Faturada', short: 'Faturadas', dot: 'bg-teal-600', pill: 'bg-teal-600/12 text-teal-700 dark:text-teal-300' },
    cancelada: { label: 'Cancelada', short: 'Canceladas', dot: 'bg-zinc-400', pill: 'bg-zinc-500/12 text-zinc-600 dark:text-zinc-300' },
}

export const OS_STATUS_ORDER = ['aberta', 'agendada', 'em_andamento', 'aguardando_pecas', 'concluida', 'faturada', 'cancelada']

export function statusMeta(status: string | null | undefined): StatusMeta {
    return OS_STATUS[status ?? ''] ?? { label: status || '—', short: status || '—', dot: 'bg-zinc-400', pill: 'bg-foreground/[0.06] text-muted-foreground' }
}

export const OS_PRIORITY: Record<string, { label: string; tone: string }> = {
    baixa: { label: 'Baixa', tone: 'text-muted-foreground' },
    normal: { label: 'Normal', tone: 'text-muted-foreground' },
    alta: { label: 'Alta', tone: 'text-orange-600 dark:text-orange-400' },
    urgente: { label: 'Urgente', tone: 'text-red-600 dark:text-red-400' },
}
