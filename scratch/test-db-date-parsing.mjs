
import { formatInTimeZone } from 'date-fns-tz'

const TIMEZONE = 'America/Sao_Paulo'
const dbDate = "2026-04-28 21:12:14.521171-03"

console.log('DB String:', dbDate)
const d = new Date(dbDate)
console.log('Parsed ISO:', d.toISOString())
console.log('Formatted in Sao Paulo:', formatInTimeZone(d, TIMEZONE, 'dd/MM/yyyy HH:mm'))
