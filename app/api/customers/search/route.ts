import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'

/** Customers matching a device IMEI / serial (from OS and devices sold). */
export async function GET(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()
    const q = (new URL(req.url).searchParams.get('imei') ?? '').replace(/[^\w-]/g, '')
    if (q.length < 4) return NextResponse.json({ ids: [] })
    const [os, dev] = await Promise.all([
        ctx.db.from('service_orders').select('customer_id').eq('company_id', ctx.companyId).ilike('equipment_serial', `%${q}%`).limit(50),
        ctx.db.from('devices').select('sold_customer_id').eq('company_id', ctx.companyId).or(`imei_1.ilike.%${q}%,imei_2.ilike.%${q}%,serial_number.ilike.%${q}%`).limit(50),
    ])
    const ids = new Set<string>()
    for (const r of os.data ?? []) if (r.customer_id) ids.add(r.customer_id)
    for (const r of dev.data ?? []) if (r.sold_customer_id) ids.add(r.sold_customer_id)
    return NextResponse.json({ ids: [...ids] })
}
