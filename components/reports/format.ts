export const brl = (v: number | null | undefined) =>
    (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Axis ticks: R$ 0 · R$ 500 · R$ 1,2 mil · R$ 1,5 mi */
export const brlCompact = (v: number) => {
    const a = Math.abs(v)
    if (a >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
    if (a >= 1_000) return `R$ ${(v / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
    return `R$ ${Math.round(v).toLocaleString('pt-BR')}`
}

export const pct = (v: number | null | undefined, digits = 0) =>
    v == null ? '—' : `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: digits, minimumFractionDigits: digits })}%`

/** "2 h", "1,5 dia", "—" */
export const duration = (hours: number | null | undefined) => {
    if (hours == null) return '—'
    if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`
    if (hours < 48) return `${hours.toLocaleString('pt-BR', { maximumFractionDigits: hours < 10 ? 1 : 0 })} h`
    return `${(hours / 24).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dias`
}

/** Change vs previous period; null when there is no base to compare. */
export const change = (cur: number | null | undefined, prev: number | null | undefined) =>
    cur == null || prev == null || prev === 0 ? null : (cur - prev) / Math.abs(prev)

const WEEK = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export const dayLabel = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`
export const dayLong = (d: string) => `${WEEK[new Date(`${d}T12:00:00Z`).getUTCDay()]}, ${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`
export const monthLabel = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1]}/${m.slice(2, 4)}`
