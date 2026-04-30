import { formatInTimeZone, toDate } from 'date-fns-tz'

const TIMEZONE = 'America/Sao_Paulo'

function formatDate(date) {
    if (!date) return '-'
    const d = typeof date === 'string' ? new Date(date) : date
    return formatInTimeZone(d, TIMEZONE, 'dd/MM/yyyy')
}

const now = new Date()
console.log('--- System Time ---')
console.log('Now (UTC):', now.toISOString())
console.log('Now (Local):', now.toString())

console.log('\n--- Timezone Conversion ---')
console.log('SP Date String:', formatInTimeZone(now, TIMEZONE, 'yyyy-MM-dd HH:mm:ss'))
console.log('SP Date formatted:', formatDate(now))

const dbString = '2026-04-28 21:12:14.521171-03'
console.log('\n--- DB String Parsing ---')
console.log('DB String:', dbString)
try {
    const parsed = new Date(dbString)
    console.log('Parsed ISO:', parsed.toISOString())
    console.log('Formatted SP:', formatDate(dbString))
} catch (e) {
    console.log('Failed to parse DB string:', e.message)
}

const dbStringWithT = '2026-04-28T21:12:14.521-03:00'
console.log('\n--- DB String (ISO) Parsing ---')
console.log('DB String ISO:', dbStringWithT)
const parsedISO = new Date(dbStringWithT)
console.log('Parsed ISO:', parsedISO.toISOString())
console.log('Formatted SP:', formatDate(dbStringWithT))
