
import { formatInTimeZone, toDate } from 'date-fns-tz'

const TIMEZONE = 'America/Sao_Paulo'
const dateStrUTC = '2026-04-29T00:14:00Z'
const dateStrAmbiguous = '2026-04-29 00:14:00'
const dateStrISO = '2026-04-29T00:14:00'

console.log('--- JS Date Parsing ---')
console.log('UTC String:', dateStrUTC, '->', new Date(dateStrUTC).toISOString())
console.log('Ambiguous String:', dateStrAmbiguous, '->', new Date(dateStrAmbiguous).toISOString())
console.log('ISO No Z String:', dateStrISO, '->', new Date(dateStrISO).toISOString())

console.log('\n--- date-fns-tz toDate ---')
console.log('Ambiguous + timeZone:', toDate(dateStrAmbiguous, { timeZone: TIMEZONE }).toISOString())
console.log('Ambiguous as UTC:', toDate(dateStrAmbiguous + 'Z').toISOString())

console.log('\n--- Current System Time ---')
console.log('new Date():', new Date().toString())
console.log('ISO:', new Date().toISOString())
console.log('Sao Paulo:', formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss'))
