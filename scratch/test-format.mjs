import { formatInTimeZone } from 'date-fns-tz'

const TIMEZONE = 'America/Sao_Paulo'
const rawDate = '2026-04-28T21:12:14.521171-03:00'
const d = new Date(rawDate)

console.log('Raw:', rawDate)
console.log('Date object:', d.toString())
console.log('ISO String:', d.toISOString())
console.log('Formatted in TZ:', formatInTimeZone(d, TIMEZONE, "dd/MM/yyyy, 'às' HH:mm"))
