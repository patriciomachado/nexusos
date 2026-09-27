'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

export interface Supplier { id: string; name: string; phone: string | null; notes: string | null; bought?: number; spent?: number; orders?: number; defects?: number; loss?: number; defect_rate?: number | null }
export interface Part {
    id: string; name: string; sku: string | null; barcode: string | null; category: string | null
    device_model: string | null; part_quality: string | null; location: string | null
    cost_price: number; selling_price: number; quantity_in_stock: number; minimum_quantity: number
    supplier_id: string | null; suppliers?: { name: string } | null
}

export const QUALITIES = [
    { value: 'original', label: 'Original' },
    { value: 'premium', label: 'Premium' },
    { value: 'paralela', label: 'Paralela' },
    { value: 'recondicionada', label: 'Recondicionada' },
    { value: 'outra', label: 'Outra' },
] as const
export const qualityLabel = (q?: string | null) => QUALITIES.find(x => x.value === q)?.label ?? (q ? q : '')

// Kinds from lib/inventory/movements.ts (shared ledger with Produtos).
export const REASONS: Record<string, string> = {
    os: 'Usada em OS', devolucao: 'Voltou da OS', compra: 'Compra recebida', ajuste: 'Ajuste manual',
    defeito: 'Defeito', venda: 'Venda', entrada: 'Entrada', saida: 'Saída',
}

export const qty = (n: number) => (Number.isInteger(Number(n)) ? String(Number(n)) : Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 }))

export function partTitle(p: { name: string; device_model?: string | null }) {
    return p.device_model && !p.name.toLowerCase().includes(p.device_model.toLowerCase()) ? `${p.name} · ${p.device_model}` : p.name
}

/** Stock state for the colored pill: out (≤0), low (≤ minimum), ok. */
export function stockState(p: { quantity_in_stock: number; minimum_quantity: number }) {
    const s = Number(p.quantity_in_stock), m = Number(p.minimum_quantity)
    if (s <= 0) return 'out' as const
    if (m > 0 && s <= m) return 'low' as const
    return 'ok' as const
}

export async function send<T = Record<string, unknown>>(url: string, method: string, body?: unknown): Promise<T> {
    const res = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(typeof d.error === 'string' ? d.error : 'Não foi possível salvar')
    return d as T
}

/** Loads a JSON endpoint; reload() fetches again. */
export function useData<T>(url: string) {
    const [data, setData] = useState<T | null>(null)
    const [tick, setTick] = useState(0)
    useEffect(() => {
        let alive = true
        fetch(url).then(async r => {
            const d = await r.json().catch(() => ({}))
            if (!r.ok) throw new Error(d.error || 'Não foi possível carregar')
            if (alive) setData(d as T)
        }).catch(e => toast.error((e as Error).message))
        return () => { alive = false }
    }, [url, tick])
    const reload = useCallback(() => setTick(t => t + 1), [])
    return { data, reload }
}

/** wa.me link; Brazilian numbers without country code get 55. */
export function waLink(phone: string | null | undefined, text: string) {
    let d = (phone ?? '').replace(/\D/g, '')
    if (d && d.length <= 11) d = `55${d}`
    return `https://wa.me/${d}?text=${encodeURIComponent(text)}`
}
