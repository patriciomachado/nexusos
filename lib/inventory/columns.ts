/** Columns added by 20261002_produtos_agenda.sql; saving still works without them. */
const NEW_COLUMNS = ['supplier', 'location'] as const

export const withoutNewColumns = {
    applies(error: { code?: string; message?: string }) {
        return (error.code === 'PGRST204' || error.code === '42703') && NEW_COLUMNS.some(c => error.message?.includes(c))
    },
    strip<T extends Record<string, unknown>>(row: T) {
        const copy: Record<string, unknown> = { ...row }
        for (const c of NEW_COLUMNS) delete copy[c]
        return copy
    },
}
