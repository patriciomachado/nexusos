'use client'

import { useCallback, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { compressImage, extensionOf } from '@/lib/images/compress'
import { getLocalDateTimePickerValue } from '@/lib/utils'
import { buildInternalNotes, parseInternalNotes, type DeviceLock } from '@/lib/os/notes'

export interface Option { id: string; name: string }
export interface InventoryOption { id: string; name: string; selling_price: number; cost_price?: number | null; category?: string | null }

export interface OSItem {
    key: string
    inventory_item_id: string | null
    item_name: string
    quantity: number
    unit_price: number
    unit_cost: number
}

export interface CheckItem { id: string; text: string; completed: boolean }

export const DEFAULT_CHECKLIST: CheckItem[] = [
    { id: 'touch_screen', text: 'Touch / vidro', completed: false },
    { id: 'display', text: 'Tela', completed: false },
    { id: 'charging_port', text: 'Conector de carga', completed: false },
    { id: 'front_camera', text: 'Câmera frontal', completed: false },
    { id: 'back_camera', text: 'Câmera traseira', completed: false },
    { id: 'speaker', text: 'Alto-falante', completed: false },
    { id: 'microphone', text: 'Microfone', completed: false },
    { id: 'wifi_bluetooth', text: 'Wi-Fi / Bluetooth', completed: false },
    { id: 'buttons', text: 'Botões', completed: false },
    { id: 'sensors_biometrics', text: 'Biometria / sensores', completed: false },
]

export const DEVICE_TYPES = ['Celular', 'Notebook', 'Tablet', 'Computador', 'Smartwatch', 'Console', 'Impressora']

export const STATUS_OPTIONS = [
    { value: 'aberta', label: 'Aberta' },
    { value: 'agendada', label: 'Agendada' },
    { value: 'em_andamento', label: 'Em andamento' },
    { value: 'concluida', label: 'Concluída' },
]

export const PRIORITY_OPTIONS = [
    { value: 'baixa', label: 'Baixa' },
    { value: 'normal', label: 'Normal' },
    { value: 'alta', label: 'Alta' },
    { value: 'urgente', label: 'Urgente' },
] as const

export interface OSFormValues {
    customer_id: string
    technician_id: string
    status: string
    priority: string
    title: string
    equipment_description: string
    equipment_serial: string
    turns_on: boolean
    problem_description: string
    description: string
    device_condition: string
    notes: string
    checklist: CheckItem[]
    scheduled_date: string
    warranty_months: number
    discount: number
    terms_accepted: boolean
    lock: DeviceLock | null
}

type Initial = Record<string, unknown> & { items?: Record<string, unknown>[] | null }

function initialValues(data?: Initial | null): OSFormValues {
    const d = data ?? {}
    const { cleanNotes, security } = parseInternalNotes((d.internal_notes as string) ?? null)
    const checklist = Array.isArray(d.checklist_progress) && d.checklist_progress.length
        ? (d.checklist_progress as CheckItem[])
        : DEFAULT_CHECKLIST
    return {
        customer_id: (d.customer_id as string) || '',
        technician_id: (d.technician_id as string) || '',
        status: (d.status as string) || 'aberta',
        priority: (d.priority as string) || 'normal',
        title: (d.title as string) || '',
        equipment_description: (d.equipment_description as string) || '',
        equipment_serial: (d.equipment_serial as string) || '',
        turns_on: (d.turns_on as boolean | undefined) ?? true,
        problem_description: (d.problem_description as string) || '',
        description: (d.description as string) || '',
        device_condition: (d.device_condition as string) || '',
        notes: cleanNotes ?? '',
        checklist,
        scheduled_date: d.scheduled_date ? getLocalDateTimePickerValue(new Date(d.scheduled_date as string)) : '',
        warranty_months: Number(d.warranty_months) || 0,
        discount: Number(d.discount_amount) || 0,
        terms_accepted: !!d.terms_accepted,
        lock: security,
    }
}

function initialItems(data?: Initial | null): OSItem[] {
    return (data?.items ?? []).map((it, i) => ({
        key: `item-${i}-${String(it.id ?? '')}`,
        inventory_item_id: (it.inventory_item_id as string) || null,
        item_name: String(it.item_name ?? ''),
        quantity: Number(it.quantity) || 1,
        unit_price: Number(it.unit_price) || 0,
        unit_cost: Number(it.unit_cost) || 0,
    }))
}

export type SideKey = 'front' | 'back'

/** Form state shared by the new-OS wizard, the quick form and the edit page. */
export function useOSForm(initial?: Initial | null) {
    const [values, setValues] = useState<OSFormValues>(() => initialValues(initial))
    const [items, setItems] = useState<OSItem[]>(() => initialItems(initial))
    const [photos, setPhotos] = useState<Record<SideKey, File | null>>({ front: null, back: null })
    const [photoUrls, setPhotoUrls] = useState<Record<SideKey, string>>({
        front: (initial?.photo_front_url as string) || '',
        back: (initial?.photo_back_url as string) || '',
    })

    const set = useCallback(<K extends keyof OSFormValues>(key: K, value: OSFormValues[K]) => {
        setValues(v => ({ ...v, [key]: value }))
    }, [])

    const totals = useMemo(() => {
        const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
        const discount = Math.min(values.discount, subtotal)
        return { subtotal, discount, total: Math.max(0, subtotal - discount) }
    }, [items, values.discount])

    return { values, set, setValues, items, setItems, photos, setPhotos, photoUrls, setPhotoUrls, totals }
}

export type OSFormState = ReturnType<typeof useOSForm>

async function uploadPhoto(companyId: string, file: File, side: SideKey) {
    const compressed = await compressImage(file, 'photo')
    const path = `${companyId}/${Date.now()}-${side}.${extensionOf(compressed)}`
    const { data, error } = await supabase.storage.from('os-photos').upload(path, compressed, { contentType: compressed.type })
    if (error) throw error
    return supabase.storage.from('os-photos').getPublicUrl(data.path).data.publicUrl
}

/** Uploads new photos and creates (POST) or updates (PUT) the order. Returns the saved row. */
export async function saveOS(state: OSFormState, companyId: string, id?: string) {
    const { values: v, items, photos, photoUrls, totals } = state
    const urls = { ...photoUrls }
    for (const side of ['front', 'back'] as const) {
        const file = photos[side]
        if (file) {
            try {
                urls[side] = await uploadPhoto(companyId, file, side)
            } catch (err) {
                throw new Error(`Não foi possível enviar a foto ${side === 'front' ? 'da frente' : 'de trás'}: ${(err as Error).message}`)
            }
        }
    }

    const lineItems = items.map(i => ({
        inventory_item_id: i.inventory_item_id,
        item_name: i.item_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        unit_cost: i.unit_cost,
        total_price: i.quantity * i.unit_price,
        total_cost: i.quantity * i.unit_cost,
    }))
    const partsCost = lineItems.filter(i => i.inventory_item_id).reduce((s, i) => s + i.total_cost, 0)
    const laborCost = lineItems.filter(i => !i.inventory_item_id).reduce((s, i) => s + i.total_cost, 0)

    const res = await fetch(id ? `/api/service-orders/${id}` : '/api/service-orders', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            customer_id: v.customer_id || null,
            technician_id: v.technician_id || null,
            status: v.status,
            priority: v.priority,
            title: v.title.trim() || v.equipment_description.trim() || 'Ordem de serviço',
            equipment_description: v.equipment_description.trim() || null,
            equipment_serial: v.equipment_serial.trim() || null,
            turns_on: v.turns_on,
            problem_description: v.problem_description.trim() || null,
            description: v.description.trim() || null,
            device_condition: v.device_condition.trim() || null,
            internal_notes: buildInternalNotes(v.notes, v.lock),
            checklist_progress: v.checklist,
            scheduled_date: v.scheduled_date || null,
            warranty_months: v.warranty_months,
            discount_amount: totals.discount,
            estimated_cost: totals.total,
            parts_cost: partsCost,
            labor_cost: laborCost,
            terms_accepted: v.terms_accepted,
            photo_front_url: urls.front || null,
            photo_back_url: urls.back || null,
            items: lineItems,
        }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Não foi possível salvar a OS.')
    }
    return data as { id: string; order_number?: string }
}
