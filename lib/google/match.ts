/**
 * Matches a Google reviewer's display name with the store's customers.
 * Exact full name first, then first + last name. One-word names ("Maria")
 * are too common to guess.
 */
export interface CustomerLite { id: string; name: string; phone: string | null }
export interface Match { customer: CustomerLite; exact: boolean }

export const normName = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim()

const firstLast = (n: string) => {
    const parts = n.split(' ').filter(p => p.length > 1 && !['da', 'de', 'do', 'das', 'dos', 'e'].includes(p))
    return parts.length >= 2 ? `${parts[0]} ${parts[parts.length - 1]}` : null
}

export function buildMatcher(customers: CustomerLite[]) {
    const full = new Map<string, CustomerLite[]>()
    const short = new Map<string, CustomerLite[]>()
    for (const c of customers) {
        const n = normName(c.name)
        if (!n) continue
        full.set(n, [...(full.get(n) ?? []), c])
        const fl = firstLast(n)
        if (fl) short.set(fl, [...(short.get(fl) ?? []), c])
    }
    return (author: string): Match | null => {
        const n = normName(author)
        const exact = full.get(n)
        if (exact?.length === 1) return { customer: exact[0], exact: true }
        const fl = firstLast(n)
        const near = fl ? short.get(fl) : undefined
        if (near?.length === 1) return { customer: near[0], exact: false }
        return null
    }
}
