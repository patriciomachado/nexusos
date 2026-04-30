import { formatInTimeZone } from 'date-fns-tz'

const TIMEZONE = 'America/Sao_Paulo'
const dateStr = '2026-04-29T01:25:00Z' // UTC time
const d = new Date(dateStr)

console.log('UTC:', dateStr)
console.log('Local (Server):', d.toString())
console.log('Formatted in Sao Paulo:', formatInTimeZone(d, TIMEZONE, "dd/MM/yyyy, 'às' HH:mm"))
