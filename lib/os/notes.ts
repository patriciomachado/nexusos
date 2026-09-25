/**
 * The device unlock code is kept as one line inside internal_notes:
 *   [Segurança] PIN/Senha: 1234
 *   [Segurança] Padrão Android: 0-1-2-5-8
 * These helpers read it out and write it back.
 */
export type LockType = 'pin' | 'pattern'
export interface DeviceLock { type: LockType; value: string }

export function parseInternalNotes(notes: string | null | undefined): { cleanNotes: string | null; security: DeviceLock | null } {
    if (!notes) return { cleanNotes: null, security: null }
    let security: DeviceLock | null = null
    const clean = notes.split('\n').filter(line => {
        if (!line.includes('[Segurança]')) return true
        const pin = line.match(/\[Segurança\] PIN\/Senha:\s*(.*)/i)
        const pattern = line.match(/\[Segurança\] Padrão Android:\s*(.*)/i)
        if (pin) security = { type: 'pin', value: pin[1].trim() }
        else if (pattern) security = { type: 'pattern', value: pattern[1].trim() }
        return false
    })
    return { cleanNotes: clean.join('\n').trim() || null, security }
}

export function buildInternalNotes(notes: string | null | undefined, lock: DeviceLock | null) {
    const base = (notes ?? '').trim()
    if (!lock?.value) return base
    const line = `[Segurança] ${lock.type === 'pin' ? 'PIN/Senha' : 'Padrão Android'}: ${lock.value}`
    return base ? `${base}\n${line}` : line
}
