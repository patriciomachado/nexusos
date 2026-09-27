/** Modules turned off for the whole store, from companies.settings.modules_off. */
export function offModules(settings: unknown): string[] {
    const raw = (settings as { modules_off?: unknown } | null)?.modules_off
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string' && x.startsWith('/')).slice(0, 50) : []
}
