import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase'
import { brandOf } from '@/lib/studio/brand'
import { aiConfigured, deviceSource, OS_SELECT, osSource, studioLimit, studioUsage } from '@/lib/studio/server'
import StudioClient, { type DeviceItem, type OsItem, type SavedPost } from '@/components/studio/StudioClient'

const thumb = (photos: string[]) => photos.find(p => p.startsWith('http')) ?? null

export default async function StudioPage({ searchParams }: { searchParams: Promise<{ os_id?: string; device_id?: string; topic?: string }> }) {
    const { userId } = await auth()
    if (!userId) redirect('/entrar')

    const db = createAdminClient()
    const { data: user } = await db.from('users').select('id, role, company_id').eq('clerk_id', userId).single()
    if (!user?.company_id) redirect('/dashboard')
    const companyId = user.company_id

    const [{ data: company }, { data: orders }, { data: devices }, { data: posts }, used, limit] = await Promise.all([
        db.from('companies').select('name, phone, city, logo_url, settings').eq('id', companyId).single(),
        db.from('service_orders').select(OS_SELECT).eq('company_id', companyId)
            .in('status', ['concluida', 'faturada']).order('updated_at', { ascending: false }).limit(30),
        // Photos of devices are stored inline and can be large: the list gets no photos, the editor loads them.
        db.from('devices').select('id, brand, model, storage, condition, battery_health, cash_price, installment_price, warranty_months, technical_passport, status')
            .eq('company_id', companyId).eq('status', 'disponivel').order('created_at', { ascending: false }).limit(30),
        db.from('studio_scripts').select('id, title, source_type, source_id, instagram_caption, whatsapp_text, google_post, body_script, status, scheduled_for, art, created_at')
            .eq('company_id', companyId).order('created_at', { ascending: false }).limit(200),
        studioUsage(db, companyId),
        studioLimit(db, companyId),
    ])

    const osItems: OsItem[] = (orders ?? []).map(o => {
        const s = osSource(o as Record<string, unknown>)
        return { id: s.id, number: s.number, device: s.device, solution: s.solution, photos: s.photos.length, thumb: thumb(s.photos) }
    })
    const deviceItems: DeviceItem[] = (devices ?? []).map(d => {
        const s = deviceSource({ ...d, images: [] } as Record<string, unknown>)
        return { id: s.id, name: s.name, price: s.price }
    })

    const params = await searchParams
    const open = params.os_id ? { type: 'os' as const, id: params.os_id }
        : params.device_id ? { type: 'device' as const, id: params.device_id }
        : params.topic ? { type: 'manual' as const, topic: params.topic.slice(0, 200) }
        : null

    return (
        <StudioClient
            brand={brandOf(company)}
            orders={osItems}
            devices={deviceItems}
            initialPosts={(posts ?? []) as SavedPost[]}
            ai={{ used, limit, configured: aiConfigured() }}
            canEditBrand={['admin', 'owner', 'manager'].includes(user.role)}
            open={open}
        />
    )
}
