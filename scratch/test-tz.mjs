import { formatInTimeZone } from 'date-fns-tz'

const TIMEZONE = 'America/Sao_Paulo'
const dateStr = '2026-04-29T00:14:00Z'
const d = new Date(dateStr)

console.log('Original String:', dateStr)
console.log('Date Object (UTC):', d.toUTCString())
console.log('Formatted in TZ:', formatInTimeZone(d, TIMEZONE, "dd/MM/yyyy, 'às' HH:mm"))
