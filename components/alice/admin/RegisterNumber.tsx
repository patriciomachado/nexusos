'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Loader2, RefreshCw, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Status {
    display_phone_number?: string
    verified_name?: string
    code_verification_status?: string
    name_status?: string
    platform_type?: string
}

type Problem = { error: string; code: number | null; details: string | null }

const NAME: Record<string, string> = {
    APPROVED: 'aprovado',
    AVAILABLE_WITHOUT_REVIEW: 'aprovado',
    PENDING_REVIEW: 'em análise pela Meta',
    DECLINED: 'recusado pela Meta — edite o nome no WhatsApp Manager',
    EXPIRED: 'expirado — envie o nome de novo no WhatsApp Manager',
    NONE: 'não enviado',
}

/**
 * Registers the saved number on the WhatsApp Cloud API and shows where it
 * stands, with Meta's real error instead of the dashboard's generic one.
 */
export default function RegisterNumber() {
    const [status, setStatus] = useState<Status | null>(null)
    const [problem, setProblem] = useState<Problem | null>(null)
    const [loading, setLoading] = useState(true)
    const [pin, setPin] = useState('')
    const [busy, setBusy] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/alice/whatsapp/register', { cache: 'no-store' })
            const data = await res.json().catch(() => ({}))
            if (res.ok) { setStatus(data.status); setProblem(null) } else setProblem(data)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    const register = async () => {
        setBusy(true)
        setProblem(null)
        try {
            const res = await fetch('/api/alice/whatsapp/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) { setProblem(data); return }
            toast.success('Número registrado na API do WhatsApp')
            setPin('')
            if (data.status) setStatus(data.status); else load()
        } finally {
            setBusy(false)
        }
    }

    const verified = status?.code_verification_status === 'VERIFIED'
    const registered = status?.platform_type === 'CLOUD_API'
    const nameOk = status?.name_status === 'APPROVED' || status?.name_status === 'AVAILABLE_WITHOUT_REVIEW'

    return (
        <div className="rounded-xl bg-foreground/[0.03] border border-border/60 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
                <p className="text-[15px] font-medium">Situação do número na Meta</p>
                <button type="button" onClick={load} disabled={loading} className="w-8 h-8 rounded-full flex items-center justify-center text-primary hover:bg-foreground/[0.05]" aria-label="Atualizar situação">
                    <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
                </button>
            </div>
            {loading && !status ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : status ? (
                <ul className="space-y-1.5 text-[14px]">
                    <Row ok={!!status.display_phone_number} label={`Número: ${status.display_phone_number ?? '—'}${status.verified_name ? ` (${status.verified_name})` : ''}`} />
                    {status.code_verification_status !== undefined && <Row ok={verified} label={verified ? 'Número verificado' : 'Número não verificado — confirme o código de SMS/ligação na Meta'} />}
                    {status.name_status !== undefined && <Row ok={nameOk} label={`Nome de exibição: ${NAME[status.name_status] ?? status.name_status}`} />}
                    {status.platform_type !== undefined && <Row ok={registered} label={registered ? 'Registrado na API — pronto para receber mensagens' : 'Ainda não registrado na API'} />}
                </ul>
            ) : null}

            {!registered && (
                <div className="space-y-2">
                    <p className="text-[13px] text-muted-foreground">
                        Crie um PIN de 6 dígitos (se o número já tiver verificação em duas etapas, use o PIN que já existe) e registre por aqui. Se a Meta recusar, o motivo aparece abaixo.
                    </p>
                    <div className="flex items-center gap-2">
                        <input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="off" placeholder="PIN de 6 dígitos" aria-label="PIN de 6 dígitos"
                            className="w-40 h-10 px-3 rounded-lg bg-foreground/[0.05] text-[16px] tracking-widest tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40" />
                        <button type="button" onClick={register} disabled={busy || pin.length !== 6} className="h-10 px-4 rounded-full bg-primary text-primary-foreground text-[15px] font-semibold disabled:opacity-40 inline-flex items-center gap-2">
                            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Registrar número
                        </button>
                    </div>
                </div>
            )}

            {problem && (
                <div role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-[14px] text-red-700 dark:text-red-400 space-y-1">
                    <p className="flex gap-1.5"><TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" /> {problem.error}</p>
                    {(problem.details || problem.code) && (
                        <p className="text-[12px] opacity-80">Detalhe da Meta{problem.code ? ` (código ${problem.code})` : ''}: {problem.details ?? '—'}</p>
                    )}
                </div>
            )}
        </div>
    )
}

function Row({ ok, label }: { ok: boolean; label: string }) {
    return (
        <li className="flex gap-2">
            <span className={cn('mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0', ok ? 'bg-green-500 text-white' : 'bg-orange-500/20 text-orange-600')}>
                {ok ? <Check className="w-3 h-3" /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
            </span>
            <span>{label}</span>
        </li>
    )
}
