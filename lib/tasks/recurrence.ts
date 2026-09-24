import type { Recurrence } from './types'
import { addDays, weekdayOf, WEEKDAYS } from './dates'

function daysInMonth(year: number, month0: number) {
    return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate()
}

/**
 * Next occurrence strictly after `from` (YYYY-MM-DD).
 * `from` is the date the finished occurrence was scheduled for.
 */
export function nextOccurrence(rule: Recurrence, from: string): string {
    const interval = Math.max(1, rule.interval || 1)

    if (rule.freq === 'daily') return addDays(from, interval)

    if (rule.freq === 'weekly') {
        const days = rule.weekdays && rule.weekdays.length > 0 ? [...rule.weekdays].sort() : [weekdayOf(from)]
        // Remaining days in the same week first, then jump `interval` weeks.
        for (let i = 1; i <= 7; i++) {
            const candidate = addDays(from, i)
            const wd = weekdayOf(candidate)
            const crossedWeek = wd <= weekdayOf(from) || i === 7
            if (days.includes(wd)) {
                if (!crossedWeek || interval === 1) return candidate
                return addDays(candidate, 7 * (interval - 1))
            }
        }
        return addDays(from, 7 * interval)
    }

    // monthly
    const y = +from.slice(0, 4)
    const m0 = +from.slice(5, 7) - 1
    const targetDay = rule.day_of_month ?? +from.slice(8, 10)
    const total = m0 + interval
    const ny = y + Math.floor(total / 12)
    const nm0 = total % 12
    const d = Math.min(targetDay, daysInMonth(ny, nm0))
    return `${ny}-${String(nm0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function describeRecurrence(rule: Recurrence | null | undefined): string {
    if (!rule) return ''
    const n = rule.interval || 1
    if (rule.freq === 'daily') return n === 1 ? 'Todo dia' : `A cada ${n} dias`
    if (rule.freq === 'weekly') {
        const days = (rule.weekdays ?? []).slice().sort()
        const isWorkweek = days.length === 5 && [1, 2, 3, 4, 5].every(d => days.includes(d))
        const names = isWorkweek ? 'dias úteis' : days.map(d => WEEKDAYS[d].slice(0, 3)).join(', ')
        if (n === 1) return days.length ? (isWorkweek ? 'Dias úteis' : `Toda ${names}`) : 'Toda semana'
        return `A cada ${n} semanas${days.length ? ` (${names})` : ''}`
    }
    const day = rule.day_of_month ? ` no dia ${rule.day_of_month}` : ''
    return n === 1 ? `Todo mês${day}` : `A cada ${n} meses${day}`
}
