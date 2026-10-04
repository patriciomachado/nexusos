'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { FileText, Film, ImageIcon, Loader2, Music, Paperclip, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

/** JSON call to the Alice API; throws an Error carrying the server's message. */
export async function api<T = Record<string, unknown>>(url: string, init?: Omit<RequestInit, 'body'> & { body?: unknown }): Promise<T> {
    const { body, ...rest } = init ?? {}
    const res = await fetch(url, {
        cache: 'no-store',
        ...rest,
        ...(body !== undefined ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Algo deu errado. Tente de novo.')
    return data as T
}

/** Loads a list endpoint once and exposes a reload. */
export function useLoad<T>(url: string) {
    const [data, setData] = useState<T | null>(null)
    const [error, setError] = useState<string | null>(null)
    const reload = useCallback(async () => {
        try {
            setData(await api<T>(url))
            setError(null)
        } catch (err) {
            setError((err as Error).message)
        }
    }, [url])
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        reload()
    }, [reload])
    return { data, error, reload, setData }
}

export function Panel({ title, description, action, children, className }: { title?: string; description?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
    return (
        <section className={cn('rounded-2xl bg-card border border-border/60 overflow-hidden', className)}>
            {(title || action) && (
                <header className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        {title && <h2 className="type-headline">{title}</h2>}
                        {description && <p className="text-[14px] text-muted-foreground">{description}</p>}
                    </div>
                    {action && <div className="shrink-0">{action}</div>}
                </header>
            )}
            {children}
        </section>
    )
}

export function Notice({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'warn' | 'error' }) {
    return (
        <div className={cn('rounded-2xl px-4 py-3 text-[14px]', tone === 'warn' ? 'bg-orange-500/10 border border-orange-500/20' : tone === 'error' ? 'bg-red-500/10 border border-red-500/20' : 'bg-primary/[0.06] border border-primary/15')}>
            {children}
        </div>
    )
}

export function Empty({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="px-6 py-10 text-center space-y-2">
            <span className="mx-auto w-11 h-11 rounded-full bg-foreground/[0.06] text-muted-foreground flex items-center justify-center">{icon}</span>
            <p className="text-[15px] text-muted-foreground max-w-md mx-auto">{children}</p>
        </div>
    )
}

export function Spinner() {
    return <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
}

export function Button({ variant = 'primary', busy, className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'soft' | 'danger'; busy?: boolean }) {
    return (
        <button
            type="button"
            {...props}
            disabled={props.disabled || busy}
            className={cn(
                'h-10 px-4 rounded-full text-[15px] font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-50 transition-opacity',
                variant === 'primary' && 'bg-primary text-primary-foreground',
                variant === 'soft' && 'bg-foreground/[0.07] text-foreground',
                variant === 'danger' && 'bg-red-500/12 text-red-600 dark:text-red-400',
                className,
            )}
        >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {children}
        </button>
    )
}

export const fieldCls = 'w-full rounded-xl bg-foreground/[0.05] px-3.5 py-2.5 text-[16px] focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground/60'

export function FieldRow({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
    return (
        <label className="block space-y-1">
            <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
            {children}
            {hint && <span className="block text-[12px] text-muted-foreground">{hint}</span>}
        </label>
    )
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
    return (
        <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
            className={cn('relative w-[51px] h-[31px] rounded-full shrink-0 transition-colors disabled:opacity-50', checked ? 'bg-green-500' : 'bg-foreground/20')}>
            <span className={cn('absolute top-[2px] left-[2px] w-[27px] h-[27px] rounded-full bg-white shadow transition-transform', checked && 'translate-x-5')} />
        </button>
    )
}

export function StatusPill({ tone, children }: { tone: 'green' | 'orange' | 'red' | 'gray' | 'blue'; children: React.ReactNode }) {
    const map = { green: 'bg-green-500/12 text-green-700 dark:text-green-400', orange: 'bg-orange-500/12 text-orange-700 dark:text-orange-400', red: 'bg-red-500/12 text-red-600 dark:text-red-400', gray: 'bg-foreground/[0.07] text-muted-foreground', blue: 'bg-primary/12 text-primary' }
    return <span className={cn('inline-flex items-center h-6 px-2.5 rounded-full text-[12px] font-semibold whitespace-nowrap', map[tone])}>{children}</span>
}

export interface Attachment { url: string; type: 'image' | 'video' | 'document' | 'audio'; name: string }

const ATTACH_ICON = { image: ImageIcon, video: Film, audio: Music, document: FileText }

/** Picks a file, uploads it and hands back the public URL (images, video, audio, PDF, Office documents — up to 16 MB). */
export function AttachmentPicker({ value, onChange }: { value: Attachment | null; onChange: (a: Attachment | null) => void }) {
    const input = useRef<HTMLInputElement>(null)
    const [busy, setBusy] = useState(false)

    const upload = async (file: File) => {
        setBusy(true)
        try {
            const form = new FormData()
            form.set('file', file)
            const res = await fetch('/api/alice/media', { method: 'POST', body: form })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.error ?? 'Não foi possível enviar o arquivo.')
            onChange(data as Attachment)
        } catch (err) {
            toast.error((err as Error).message)
        } finally {
            setBusy(false)
            if (input.current) input.current.value = ''
        }
    }

    if (value) {
        const Icon = ATTACH_ICON[value.type]
        return (
            <div className="flex items-center gap-3 rounded-xl bg-foreground/[0.05] px-3 py-2">
                {value.type === 'image'
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={value.url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    : <span className="w-10 h-10 rounded-lg bg-card flex items-center justify-center text-muted-foreground"><Icon className="w-5 h-5" /></span>}
                <span className="min-w-0 flex-1 text-[14px] truncate">{value.name}</span>
                <button type="button" onClick={() => onChange(null)} aria-label="Remover anexo" className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-foreground/[0.08]"><X className="w-4 h-4" /></button>
            </div>
        )
    }
    return (
        <>
            <input ref={input} type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,audio/mpeg,audio/ogg,audio/mp4,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" onChange={e => { const f = e.target.files?.[0]; if (f) upload(f) }} />
            <Button variant="soft" busy={busy} onClick={() => input.current?.click()}><Paperclip className="w-4 h-4" /> Anexar imagem, vídeo ou PDF</Button>
        </>
    )
}

export function attachmentFields(a: Attachment | null) {
    return { media_url: a?.url ?? null, media_type: a?.type ?? null, media_name: a?.name ?? null }
}

export function dateTime(iso: string) {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

/** <input type="datetime-local"> value (local time) for a Date. */
export function toLocalInput(d: Date) {
    const p = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
