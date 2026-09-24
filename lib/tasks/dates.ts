/**
 * Date helpers for the Tarefas module.
 *
 * Tasks live on calendar days (YYYY-MM-DD), not timestamps, so "today" must
 * always be the person's local day. The browser sends its local date to the
 * API; the server never derives "today" from its own UTC clock.
 */

export const DEFAULT_TIMEZONE = 'America/Sao_Paulo'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isDateString(value: unknown): value is string {
    if (typeof value !== 'string' || !DATE_RE.test(value)) return false
    const d = new Date(`${value}T12:00:00Z`)
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}

/** YYYY-MM-DD for the local day of `date`. */
export function localDateString(date: Date = new Date()): string {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

/** YYYY-MM-DD for "now" in a given IANA time zone (server-side fallback). */
export function dateStringInZone(timeZone = DEFAULT_TIMEZONE, date: Date = new Date()): string {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
    const get = (t: string) => parts.find(p => p.type === t)?.value ?? '00'
    return `${get('year')}-${get('month')}-${get('day')}`
}

/** HH:MM for "now" in a given IANA time zone. */
export function timeInZone(timeZone = DEFAULT_TIMEZONE, date: Date = new Date()): string {
    return new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date)
}

/** Adds whole days to a YYYY-MM-DD string. */
export function addDays(day: string, amount: number): string {
    const d = new Date(`${day}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() + amount)
    return d.toISOString().slice(0, 10)
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function diffDays(from: string, to: string): number {
    const a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10))
    const b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10))
    return Math.round((b - a) / 86_400_000)
}

/** 0 (Sunday) … 6 (Saturday) for a YYYY-MM-DD string. */
export function weekdayOf(day: string): number {
    return new Date(`${day}T12:00:00Z`).getUTCDay()
}

/** Resolves the `today` query param, falling back to the shop's time zone. */
export function resolveToday(param: string | null | undefined): string {
    return isDateString(param) ? param : dateStringInZone()
}

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** "Hoje", "Amanhã", "Ontem", "sexta", or "12 de mar". */
export function relativeDayLabel(day: string, today: string): string {
    const diff = diffDays(today, day)
    if (diff === 0) return 'Hoje'
    if (diff === 1) return 'Amanhã'
    if (diff === -1) return 'Ontem'
    if (diff > 1 && diff < 7) return capitalize(WEEKDAYS[weekdayOf(day)])
    return `${+day.slice(8, 10)} de ${MONTHS[+day.slice(5, 7) - 1]}`
}

export function longDayLabel(day: string): string {
    return `${capitalize(WEEKDAYS[weekdayOf(day)])}, ${+day.slice(8, 10)} de ${MONTHS[+day.slice(5, 7) - 1]}`
}

export function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1)
}

export { WEEKDAYS, MONTHS }
