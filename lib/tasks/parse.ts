import type { DayPeriod, Recurrence, TaskPriority } from './types'
import { addDays, weekdayOf, relativeDayLabel } from './dates'
import { describeRecurrence } from './recurrence'

/**
 * Quick-add parser (Todoist / TickTick style) for Brazilian Portuguese.
 *
 *   "Ligar fornecedor amanhã 14h !alta"      → amanhã, 14:00, prioridade alta
 *   "Pagar aluguel todo dia 10"               → mensal, dia 10
 *   "Conferir estoque toda segunda de manhã"  → semanal (seg), manhã
 *   "Entregar orçamento prazo sexta"          → prazo sexta-feira
 *   "Revisar vitrine por 30min"               → duração 30 min
 */

export interface ParsedTask {
    title: string
    do_date?: string
    do_time?: string
    day_period?: DayPeriod
    deadline?: string
    priority?: TaskPriority
    recurrence?: Recurrence
    duration_minutes?: number
    /** Human-readable chips describing what was understood. */
    chips: { kind: 'date' | 'time' | 'period' | 'deadline' | 'priority' | 'recurrence' | 'duration'; label: string }[]
}

const WEEKDAY_WORDS: [RegExp, number][] = [
    [/domingo/, 0],
    [/segunda(?:-feira)?/, 1],
    [/ter[çc]a(?:-feira)?/, 2],
    [/quarta(?:-feira)?/, 3],
    [/quinta(?:-feira)?/, 4],
    [/sexta(?:-feira)?/, 5],
    [/s[áa]bado/, 6],
]

const WEEKDAY_SRC = '(domingo|segunda(?:-feira)?|ter[çc]a(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|s[áa]bado)'

// Portuguese letters so \b-like boundaries work with accents.
const L = 'a-zà-úç0-9'
const B = `(?<![${L}])`
const E = `(?![${L}])`

function weekdayNumber(word: string): number {
    for (const [re, n] of WEEKDAY_WORDS) if (re.test(word)) return n
    return -1
}

function nextWeekday(today: string, wd: number, allowToday = false): string {
    const diff = (wd - weekdayOf(today) + 7) % 7
    return addDays(today, diff === 0 && !allowToday ? 7 : diff)
}

function dayOfMonthDate(today: string, day: number): string {
    const y = +today.slice(0, 4)
    const m = +today.slice(5, 7)
    const pad = (n: number) => String(n).padStart(2, '0')
    const clamp = (yy: number, mm: number) => Math.min(day, new Date(Date.UTC(yy, mm, 0)).getUTCDate())
    if (day >= +today.slice(8, 10)) return `${y}-${pad(m)}-${pad(clamp(y, m))}`
    const ny = m === 12 ? y + 1 : y
    const nm = m === 12 ? 1 : m + 1
    return `${ny}-${pad(nm)}-${pad(clamp(ny, nm))}`
}

function explicitDate(today: string, d: number, mo: number, yr?: number): string | undefined {
    if (d < 1 || d > 31 || mo < 1 || mo > 12) return undefined
    let y = yr ? (yr < 100 ? 2000 + yr : yr) : +today.slice(0, 4)
    const pad = (n: number) => String(n).padStart(2, '0')
    let s = `${y}-${pad(mo)}-${pad(d)}`
    if (!yr && s < today) { y += 1; s = `${y}-${pad(mo)}-${pad(d)}` }
    const check = new Date(`${s}T12:00:00Z`)
    return check.toISOString().slice(0, 10) === s ? s : undefined
}

/** Parses a relative date phrase at the start of `text`. Returns [date, matchedLength]. */
function parseDatePhrase(text: string, today: string): [string, number] | null {
    let m: RegExpMatchArray | null
    if ((m = text.match(new RegExp(`^depois de amanh[ãa]${E}`)))) return [addDays(today, 2), m[0].length]
    if ((m = text.match(new RegExp(`^amanh[ãa]${E}`)))) return [addDays(today, 1), m[0].length]
    if ((m = text.match(new RegExp(`^hoje${E}`)))) return [today, m[0].length]
    if ((m = text.match(new RegExp(`^(?:(?:na|no|nesta|neste|esta|este|pr[óo]xima|pr[óo]ximo)\\s+)?${WEEKDAY_SRC}${E}`)))) {
        return [nextWeekday(today, weekdayNumber(m[1])), m[0].length]
    }
    if ((m = text.match(new RegExp(`^(?:(?:na\\s+)?(?:pr[óo]xima\\s+semana|semana\\s+que\\s+vem))${E}`)))) {
        return [nextWeekday(today, 1), m[0].length]
    }
    if ((m = text.match(new RegExp(`^em\\s+(\\d{1,3})\\s+dias?${E}`)))) return [addDays(today, +m[1]), m[0].length]
    if ((m = text.match(new RegExp(`^(?:(?:no\\s+)?dia\\s+)?(\\d{1,2})/(\\d{1,2})(?:/(\\d{2,4}))?(?![${L}/])`)))) {
        const s = explicitDate(today, +m[1], +m[2], m[3] ? +m[3] : undefined)
        if (s) return [s, m[0].length]
    }
    if ((m = text.match(new RegExp(`^(?:no\\s+)?dia\\s+(\\d{1,2})(?![${L}/])`)))) {
        const d = +m[1]
        if (d >= 1 && d <= 31) return [dayOfMonthDate(today, d), m[0].length]
    }
    return null
}

export function parseQuickAdd(input: string, today: string): ParsedTask {
    const original = input
    // Work on a lowercase copy with identical indexes; cut spans from both.
    let lower = original.toLowerCase()
    const spans: [number, number][] = []
    const out: ParsedTask = { title: original.trim(), chips: [] }

    const take = (re: RegExp, fn: (m: RegExpExecArray) => boolean | void) => {
        re.lastIndex = 0
        let m: RegExpExecArray | null
        while ((m = re.exec(lower))) {
            const start = m.index
            const end = start + m[0].length
            if (spans.some(([a, b]) => start < b && end > a)) continue
            if (fn(m) !== false) {
                spans.push([start, end])
                lower = lower.slice(0, start) + ' '.repeat(end - start) + lower.slice(end)
            }
            if (!re.global) break
        }
    }

    // Priority: !1..!4, !urgente, !alta, !normal, !baixa, p1..p4
    take(new RegExp(`${B}(?:!(urgente|alta|normal|baixa|[1-4])|p([1-4]))${E}`, 'g'), m => {
        const word = m[1] ?? m[2]
        const map: Record<string, TaskPriority> = { urgente: 1, alta: 2, normal: 3, baixa: 4, '1': 1, '2': 2, '3': 3, '4': 4 }
        out.priority = map[word]
    })

    // Recurrence
    take(new RegExp(`${B}(?:todos?\\s+os\\s+dias|todo\\s+dia(?!\\s+\\d)|diariamente)${E}`, 'g'), () => {
        out.recurrence = { freq: 'daily', interval: 1 }
    })
    take(new RegExp(`${B}(?:todo\\s+dia\\s+[úu]til|todos\\s+os\\s+dias\\s+[úu]teis|(?:nos\\s+|em\\s+)?dias\\s+[úu]teis)${E}`, 'g'), () => {
        out.recurrence = { freq: 'weekly', interval: 1, weekdays: [1, 2, 3, 4, 5] }
    })
    take(new RegExp(`${B}tod[ao]s?\\s+(?:as\\s+|os\\s+)?${WEEKDAY_SRC}s?${E}`, 'g'), m => {
        const wd = weekdayNumber(m[1])
        const prev = out.recurrence?.freq === 'weekly' ? out.recurrence.weekdays ?? [] : []
        out.recurrence = { freq: 'weekly', interval: 1, weekdays: Array.from(new Set([...prev, wd])).sort() }
    })
    take(new RegExp(`${B}(?:toda\\s+semana|semanalmente)${E}`, 'g'), () => {
        out.recurrence = { freq: 'weekly', interval: 1 }
    })
    take(new RegExp(`${B}(?:todo\\s+m[êe]s|mensalmente)(?:\\s+(?:no\\s+)?dia\\s+(\\d{1,2}))?${E}`, 'g'), m => {
        out.recurrence = { freq: 'monthly', interval: 1, ...(m[1] ? { day_of_month: Math.min(31, +m[1]) } : {}) }
    })
    take(new RegExp(`${B}todo\\s+dia\\s+(\\d{1,2})${E}`, 'g'), m => {
        const d = +m[1]
        if (d < 1 || d > 31) return false
        out.recurrence = { freq: 'monthly', interval: 1, day_of_month: d }
    })

    // Deadline: "prazo sexta", "até amanhã", "até dia 20"
    take(new RegExp(`${B}(?:prazo(?:\\s+(?:at[ée]|para|pra))?|at[ée]|entregar\\s+at[ée])\\s+`, 'g'), m => {
        const rest = lower.slice(m.index + m[0].length)
        const parsed = parseDatePhrase(rest, today)
        if (!parsed) return false
        out.deadline = parsed[0]
        // Extend the span over the date phrase too.
        const end = m.index + m[0].length + parsed[1]
        spans.push([m.index, end])
        lower = lower.slice(0, m.index) + ' '.repeat(end - m.index) + lower.slice(end)
        return false
    })

    // Duration: "por 30min", "por 1h", "30 min", "(45min)"
    take(new RegExp(`${B}(?:por\\s+)?\\(?(\\d{1,3})\\s?(?:min|minutos?)\\)?${E}`, 'g'), m => {
        out.duration_minutes = Math.min(1440, +m[1])
    })
    take(new RegExp(`${B}por\\s+(\\d{1,2})\\s?(?:h|horas?)${E}`, 'g'), m => {
        out.duration_minutes = Math.min(1440, +m[1] * 60)
    })

    // Time: "às 14h", "14:30", "9h15", "ao meio-dia"
    take(new RegExp(`${B}(?:[àa]s?\\s+)?(\\d{1,2})(?:h(\\d{2})?|:(\\d{2}))(?:hs|h)?${E}`, 'g'), m => {
        const h = +m[1]
        const min = +(m[2] ?? m[3] ?? 0)
        if (h > 23 || min > 59) return false
        out.do_time = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
    })
    take(new RegExp(`${B}(?:ao\\s+)?meio[-\\s]dia${E}`, 'g'), () => { out.do_time = '12:00' })

    // Period
    take(new RegExp(`${B}(?:de\\s+|pela\\s+|na\\s+|[àa]\\s+)?manh[ãa]${E}`, 'g'), () => { out.day_period = 'morning' })
    take(new RegExp(`${B}(?:de\\s+|[àa]\\s+|pela\\s+|na\\s+)tarde${E}`, 'g'), () => { out.day_period = 'afternoon' })
    take(new RegExp(`${B}(?:(?:de\\s+|[àa]\\s+)noite|no\\s+fim\\s+do\\s+dia|fim\\s+do\\s+dia)${E}`, 'g'), () => { out.day_period = 'evening' })

    // Do date (first free-standing date phrase)
    for (let i = 0; i < lower.length; i++) {
        if (i > 0 && new RegExp(`[${L}]`).test(lower[i - 1])) continue
        if (lower[i] === ' ') continue
        const parsed = parseDatePhrase(lower.slice(i), today)
        // A capitalized weekday mid-sentence is most likely a name ("Seu Terça").
        const looksLikeName = parsed && i > 0 && /^[A-ZÀ-Ú]/.test(original.slice(i)) && new RegExp(`^${WEEKDAY_SRC}`).test(lower.slice(i))
        if (parsed && !looksLikeName) {
            out.do_date = parsed[0]
            spans.push([i, i + parsed[1]])
            lower = lower.slice(0, i) + ' '.repeat(parsed[1]) + lower.slice(i + parsed[1])
            break
        }
    }

    // Recurring tasks start on their first occurrence.
    if (out.recurrence && !out.do_date) {
        const r = out.recurrence
        if (r.freq === 'daily') out.do_date = today
        else if (r.freq === 'weekly' && r.weekdays?.length) {
            out.do_date = r.weekdays.map(wd => nextWeekday(today, wd, true)).sort()[0]
        } else if (r.freq === 'monthly' && r.day_of_month) out.do_date = dayOfMonthDate(today, r.day_of_month)
        else out.do_date = today
    }
    if ((out.do_time || out.day_period) && !out.do_date) out.do_date = today

    // Build the title from the untouched characters.
    spans.sort((a, b) => a[0] - b[0])
    let title = ''
    let cursor = 0
    for (const [a, b] of spans) {
        if (a < cursor) continue
        title += original.slice(cursor, a) + ' '
        cursor = b
    }
    title += original.slice(cursor)
    title = title
        .replace(/\s+/g, ' ')
        .replace(/\s+(?:na|no|nas|nos|às|as|de|do|da|para|pra|em|e|,)\s*$/i, '')
        .replace(/\s+(?:na|no|às|as|de|para|pra|em)\s+(?=(?:na|no|às|as|de|para|pra|em)\s)/gi, ' ')
        .trim()
    out.title = title ? title.charAt(0).toUpperCase() + title.slice(1) : ''

    // Chips
    if (out.do_date && !out.recurrence) out.chips.push({ kind: 'date', label: relativeDayLabel(out.do_date, today) })
    if (out.recurrence) out.chips.push({ kind: 'recurrence', label: describeRecurrence(out.recurrence) })
    if (out.do_time) out.chips.push({ kind: 'time', label: out.do_time })
    if (out.day_period && !out.do_time) out.chips.push({ kind: 'period', label: { morning: 'Manhã', afternoon: 'Tarde', evening: 'Fim do dia' }[out.day_period] })
    if (out.deadline) out.chips.push({ kind: 'deadline', label: `Prazo: ${relativeDayLabel(out.deadline, today)}` })
    if (out.duration_minutes) out.chips.push({ kind: 'duration', label: formatDuration(out.duration_minutes) })
    if (out.priority) out.chips.push({ kind: 'priority', label: ['', 'Urgente', 'Alta', 'Normal', 'Baixa'][out.priority] })

    return out
}

export function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} min`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}
