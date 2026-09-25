import 'server-only'
import { NextResponse } from 'next/server'

/** "YYYY-MM-DD" one month later, keeping the day (31 → last day of shorter months). */
export function nextMonth(day: string, preferredDay?: number) {
    const [y, m, d] = day.split('-').map(Number)
    const ny = m === 12 ? y + 1 : y
    const nm = m === 12 ? 1 : m + 1
    const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate()
    const dd = Math.min(preferredDay ?? d, last)
    return `${ny}-${String(nm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
}

export function isMissingTable(error: { code?: string; message?: string } | null) {
    return !!error && (error.code === '42P01' || error.code === 'PGRST205' || /bills/.test(error.message ?? '') && /does not exist|schema cache/.test(error.message ?? ''))
}

export function missingMigration() {
    return NextResponse.json({ error: 'Falta rodar a atualização do banco (20260930_caixa_contas.sql).', code: 'MIGRATION' }, { status: 503 })
}

export const money = (v: unknown) => {
    const x = Number(v)
    return Number.isFinite(x) && x > 0 ? Math.round(x * 100) / 100 : null
}
export const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
