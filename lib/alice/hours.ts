import 'server-only'
import { DEFAULT_TIMEZONE, dateStringInZone, timeInZone, weekdayOf } from '@/lib/tasks/dates'

export type WeekdayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'
export const WEEKDAY_KEYS: WeekdayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
export const WEEKDAY_LABELS: Record<WeekdayKey, string> = { sun: 'Domingo', mon: 'Segunda', tue: 'Terça', wed: 'Quarta', thu: 'Quinta', fri: 'Sexta', sat: 'Sábado' }

export interface BusinessHoursDay { open: string; close: string }
export interface BusinessHours {
    enabled: boolean
    days: Partial<Record<WeekdayKey, BusinessHoursDay | null>>
    after_hours_message: string | null
}

export const DEFAULT_BUSINESS_HOURS: BusinessHours = { enabled: false, days: {}, after_hours_message: null }

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

/** Defensive parse: whatever came from the client or an older row, never a shape that breaks the hours check. */
export function normalizeBusinessHours(raw: unknown): BusinessHours {
    const r = (raw ?? {}) as Partial<BusinessHours> & { days?: Record<string, unknown> }
    const days: BusinessHours['days'] = {}
    for (const key of WEEKDAY_KEYS) {
        const d = r.days?.[key] as { open?: unknown; close?: unknown } | null | undefined
        if (d && typeof d.open === 'string' && typeof d.close === 'string' && TIME_RE.test(d.open) && TIME_RE.test(d.close) && d.open < d.close) {
            days[key] = { open: d.open, close: d.close }
        }
    }
    return {
        enabled: !!r.enabled,
        days,
        after_hours_message: typeof r.after_hours_message === 'string' && r.after_hours_message.trim() ? r.after_hours_message.trim().slice(0, 600) : null,
    }
}

/** Whether the store is open right now per its configured hours. Always true when the feature is off. */
export function isWithinBusinessHours(hours: BusinessHours, at: Date = new Date()): boolean {
    if (!hours.enabled) return true
    const today = dateStringInZone(DEFAULT_TIMEZONE, at)
    const day = hours.days[WEEKDAY_KEYS[weekdayOf(today)]]
    if (!day) return false
    const time = timeInZone(DEFAULT_TIMEZONE, at)
    return time >= day.open && time < day.close
}
