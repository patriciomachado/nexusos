/**
 * CSV that opens straight in Excel/Google Sheets in Brazil: semicolon
 * separator, decimal comma, UTF-8 BOM. Text that starts like a formula is
 * prefixed so a spreadsheet never runs it.
 */
export type Cell = string | number | boolean | null | undefined

export interface Column<T> { label: string; value: (row: T) => Cell }

function cell(v: Cell): string {
    if (v === null || v === undefined) return ''
    if (typeof v === 'number') return Number.isFinite(v) ? String(Math.round(v * 100) / 100).replace('.', ',') : ''
    if (typeof v === 'boolean') return v ? 'sim' : 'não'
    let s = String(v)
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv<T>(rows: T[], columns: Column<T>[]) {
    const lines = [columns.map(c => cell(c.label)).join(';')]
    for (const r of rows) lines.push(columns.map(c => cell(c.value(r))).join(';'))
    return '﻿' + lines.join('\r\n') + '\r\n'
}

/** "2026-09-25T14:00:00Z" → "25/09/2026 11:00" (Brasília). */
export function dateTime(v: unknown) {
    if (!v) return ''
    const d = new Date(String(v))
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).replace(',', '')
}

export function dateOnly(v: unknown) {
    if (!v) return ''
    const s = String(v)
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.split('-').reverse().join('/')
    const d = new Date(s)
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}
