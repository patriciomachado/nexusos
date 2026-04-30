import { formatInTimeZone } from 'date-fns-tz'

const TIMEZONE = 'America/Sao_Paulo'
const dateStr = '2026-04-28 21:12:14.521171-03'
const d = new Date(dateStr)

console.log('Input string:', dateStr)
console.log('Parsed Date object (UTC):', d.toISOString())
console.log('Formatted in SP timezone:', formatInTimeZone(d, TIMEZONE, 'dd/MM/yyyy, às HH:mm'))
console.log('Formatted date only:', formatInTimeZone(d, TIMEZONE, 'dd/MM/yyyy'))
