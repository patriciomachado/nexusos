export function digitsOnly(value: string | null | undefined) {
    return (value ?? '').replace(/\D/g, '')
}

/**
 * Brazilian numbers as a comparable key: area code + last 8 digits.
 * Handles the country code (55) and the mobile "9" prefix, which WhatsApp
 * sometimes omits (5511 8888-7777 vs 11 98888-7777).
 */
export function phoneKey(value: string | null | undefined): string | null {
    let d = digitsOnly(value)
    if (d.length >= 12 && d.startsWith('55')) d = d.slice(2)
    if (d.length < 10) return null
    const area = d.slice(0, 2)
    return area + d.slice(-8)
}

export function samePhone(a: string | null | undefined, b: string | null | undefined) {
    const ka = phoneKey(a)
    return !!ka && ka === phoneKey(b)
}

/** "5511988887777" → "(11) 98888-7777" for display. */
export function formatWhatsApp(value: string) {
    let d = digitsOnly(value)
    if (d.length >= 12 && d.startsWith('55')) d = d.slice(2)
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
    return value
}
