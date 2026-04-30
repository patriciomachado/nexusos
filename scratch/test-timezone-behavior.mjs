import { formatInTimeZone } from 'date-fns-tz'

const TIMEZONE = 'America/Sao_Paulo'
const dateStr = '2026-04-29T00:14:00Z' // UTC time
const d = new Date(dateStr)

console.log('--- UTC ISO String (with Z) ---')
console.log('Original String:', dateStr)
console.log('JS Date object (ISO):', d.toISOString())
console.log('Formatted in SP:', formatInTimeZone(d, TIMEZONE, 'dd/MM/yyyy HH:mm'))

console.log('\n--- Ambiguous String (no Z, with T) ---')
const dateStr2 = '2026-04-29T00:14:00'
const d2 = new Date(dateStr2)
console.log('Original String:', dateStr2)
console.log('JS Date object (ISO):', d2.toISOString())
console.log('Formatted in SP:', formatInTimeZone(d2, TIMEZONE, 'dd/MM/yyyy HH:mm'))

console.log('\n--- DB-like String (no Z, with space) ---')
const dateStr3 = '2026-04-29 00:14:00'
const d3 = new Date(dateStr3)
console.log('Original String:', dateStr3)
console.log('JS Date object (ISO):', d3.toISOString())
console.log('Formatted in SP:', formatInTimeZone(d3, TIMEZONE, 'dd/MM/yyyy HH:mm'))
