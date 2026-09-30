/**
 * The store's brand kit for the Studio: what goes on every art and text.
 * Kept in companies.settings.brand; anything missing falls back to the
 * store's own registration (name, logo, phone, city).
 */

export interface Brand {
    name: string
    tagline: string
    whatsapp: string
    city: string
    instagram: string
    primary: string
    secondary: string
    logoUrl: string | null
}

export interface CompanyBasics {
    name?: string | null
    phone?: string | null
    city?: string | null
    logo_url?: string | null
    settings?: unknown
}

const HEX = /^#[0-9a-f]{6}$/i
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const color = (v: unknown, fallback: string) => (typeof v === 'string' && HEX.test(v) ? v.toUpperCase() : fallback)

export const DEFAULT_PRIMARY = '#2563EB'
export const DEFAULT_SECONDARY = '#F59E0B'

/** Only the fields a person may edit, cleaned. */
export function cleanBrandInput(raw: unknown) {
    const r = (raw ?? {}) as Record<string, unknown>
    return {
        name: text(r.name, 60),
        tagline: text(r.tagline, 80),
        whatsapp: text(r.whatsapp, 30),
        city: text(r.city, 60),
        instagram: text(r.instagram, 40).replace(/^@+/, ''),
        primary: color(r.primary, DEFAULT_PRIMARY),
        secondary: color(r.secondary, DEFAULT_SECONDARY),
    }
}

export function brandOf(company: CompanyBasics | null | undefined): Brand {
    const saved = ((company?.settings as { brand?: unknown } | null)?.brand ?? {}) as Record<string, unknown>
    const b = cleanBrandInput(saved)
    return {
        name: b.name || company?.name?.trim() || 'Nossa loja',
        tagline: b.tagline,
        whatsapp: b.whatsapp || company?.phone?.trim() || '',
        city: b.city || company?.city?.trim() || '',
        instagram: b.instagram,
        primary: b.primary,
        secondary: b.secondary,
        logoUrl: company?.logo_url || null,
    }
}

/** Replaces {loja}, {cidade}, {whatsapp}, {instagram} and {slogan} in a ready-made text. */
export function fillBrand(template: string, brand: Brand) {
    return template
        .replace(/\{loja\}/g, brand.name)
        .replace(/\{cidade\}/g, brand.city || 'nossa cidade')
        .replace(/\{whatsapp\}/g, brand.whatsapp || 'nosso WhatsApp')
        .replace(/\{instagram\}/g, brand.instagram ? `@${brand.instagram}` : brand.name)
        .replace(/\{slogan\}/g, brand.tagline)
        .replace(/\{hashcidade\}/g, (brand.city || '').toLowerCase().normalize('NFD').replace(/[^a-z]/g, ''))
        .replace(/ #(\s|$)/g, '$1') // an empty hashtag when the city is unknown
}
