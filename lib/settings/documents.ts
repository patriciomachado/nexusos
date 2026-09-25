/**
 * How printed documents look (sale receipt and OS). Stored in
 * companies.settings.documents; everything has a sensible default so a store
 * that never opened the screen keeps printing the same as before.
 */
export interface DocumentSettings {
    /** Hex color for titles and borders on the OS. */
    accent: string
    show_logo: boolean
    /** Short line under the store name (e.g. "Assistência técnica autorizada"). */
    tagline: string
    receipt_footer: string
    /** Terms printed above the signatures on the OS. */
    os_terms: string
    /** Days before an unclaimed device may be sold; 0 hides the line. */
    abandon_days: number
    show_tracking: boolean
    show_tech_signature: boolean
}

export const DOCUMENT_COLORS = ['#111111', '#0A84FF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5856D6', '#8E6E53']

export const DEFAULT_DOCUMENTS: DocumentSettings = {
    accent: '#111111',
    show_logo: true,
    tagline: '',
    receipt_footer: '',
    os_terms: '',
    abandon_days: 90,
    show_tracking: true,
    show_tech_signature: true,
}

const HEX = /^#[0-9a-fA-F]{6}$/

/** Reads the saved settings, falling back to defaults field by field. */
export function readDocuments(settings: unknown): DocumentSettings {
    const s = (settings ?? {}) as { documents?: Partial<DocumentSettings>; receipt?: { footer?: string } }
    const d = s.documents ?? {}
    const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')
    return {
        accent: typeof d.accent === 'string' && HEX.test(d.accent) ? d.accent : DEFAULT_DOCUMENTS.accent,
        show_logo: d.show_logo !== false,
        tagline: str(d.tagline, 80),
        // Older stores saved the footer under settings.receipt.
        receipt_footer: str(d.receipt_footer, 400) || str(s.receipt?.footer, 400),
        os_terms: str(d.os_terms, 1500),
        abandon_days: Number.isFinite(Number(d.abandon_days)) ? Math.min(Math.max(Math.round(Number(d.abandon_days)), 0), 365) : DEFAULT_DOCUMENTS.abandon_days,
        show_tracking: d.show_tracking !== false,
        show_tech_signature: d.show_tech_signature !== false,
    }
}

/** Validates input from the settings screen into the stored shape. */
export function cleanDocuments(input: unknown): DocumentSettings {
    return readDocuments({ documents: input })
}
