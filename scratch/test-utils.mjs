
import { formatInTimeZone, toDate } from 'date-fns-tz'

const TIMEZONE = 'America/Sao_Paulo'

export function getStartOfDay(date = new Date()) {
    const dateStr = formatInTimeZone(date, TIMEZONE, 'yyyy-MM-dd')
    return toDate(`${dateStr}T00:00:00`, { timeZone: TIMEZONE })
}

console.log('--- getStartOfDay Test ---')
const now = new Date()
console.log('Now:', now.toISOString())
const startOfToday = getStartOfDay(now)
console.log('Start of Today (SP):', startOfToday.toISOString())
console.log('Local string:', formatInTimeZone(startOfToday, TIMEZONE, 'yyyy-MM-dd HH:mm:ss'))
