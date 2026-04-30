
import { formatInTimeZone } from 'date-fns-tz'

const TIMEZONE = 'America/Sao_Paulo'
const now = new Date()

console.log('--- Current Node environment time ---')
console.log('ISO String:', now.toISOString())
console.log('toString:', now.toString())
console.log('São Paulo Time:', formatInTimeZone(now, TIMEZONE, 'dd/MM/yyyy HH:mm:ss'))

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkDb() {
  const { data, error } = await supabase
    .from('service_orders')
    .select('id, order_number, created_at, scheduled_date')
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    console.error('Error fetching from DB:', error)
    return
  }

  if (data && data.length > 0) {
    const last = data[0]
    console.log('\n--- Last Service Order in DB ---')
    console.log('ID:', last.id)
    console.log('Order Number:', last.order_number)
    console.log('created_at (from DB):', last.created_at)
    console.log('scheduled_date (from DB):', last.scheduled_date)
    
    const createdAt = new Date(last.created_at)
    console.log('created_at parsed (SP):', formatInTimeZone(createdAt, TIMEZONE, 'dd/MM/yyyy HH:mm:ss'))
    
    if (last.scheduled_date) {
      const scheduledDate = new Date(last.scheduled_date)
      console.log('scheduled_date parsed (SP):', formatInTimeZone(scheduledDate, TIMEZONE, 'dd/MM/yyyy HH:mm:ss'))
    }
  } else {
    console.log('\nNo service orders found.')
  }
}

checkDb()
