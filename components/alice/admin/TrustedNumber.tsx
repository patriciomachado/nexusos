'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2, ShieldCheck, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

function formatDigits(d: string) {
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
    return d
}

/**
 * Lets the logged-in admin/manager register their own WhatsApp as a trusted
 * number: when they message the store's WhatsApp from it, Alice answers as
 * staff (cash, OS, agenda…) instead of treating them like a customer.
 */
export default function TrustedNumber() {
    const [phone, setPhone] = useState<string | null | undefined>(undefined)
    const [input, setInput] = useState('')
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        fetch('/api/alice/trusted-numbers').then(r => r.json()).then(d => setPhone(d.phone ?? null)).catch(() => setPhone(null))
    }, [])

    const save = async () => {
        const digits = input.replace(/\D/g, '')
        if (digits.length < 10) { toast.error('Informe um número válido, com DDD.'); return }
        setBusy(true)
        try {
            const res = await fetch('/api/alice/trusted-numbers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: digits }) })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.error || 'Não foi possível salvar.')
            setPhone(data.phone)
            setInput('')
            toast.success('Número de confiança salvo')
        } catch (err) {
            toast.error((err as Error).message)
        } finally {
            setBusy(false)
        }
    }

    const remove = async () => {
        setBusy(true)
        try {
            const res = await fetch('/api/alice/trusted-numbers', { method: 'DELETE' })
            if (!res.ok) throw new Error()
            setPhone(null)
            toast.success('Número removido')
        } catch {
            toast.error('Não foi possível remover.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <section className="lg:col-span-2 rounded-2xl bg-card border border-border/60 overflow-hidden">
            <header className="px-5 pt-5 pb-3 flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0"><ShieldCheck className="w-5 h-5" /></span>
                <div className="min-w-0">
                    <h2 className="type-headline">Seu número de confiança</h2>
                    <p className="text-[14px] text-muted-foreground">Cadastre seu WhatsApp pessoal: quando você mandar mensagem pro número da loja, a Alice te reconhece como equipe e responde consultas (caixa, OS, agenda, estoque, pendências…) em vez de tratar como cliente. Ações que alteram dados continuam só pelo app.</p>
                </div>
            </header>
            <div className="border-t border-border/60 px-5 py-4">
                {phone === undefined ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : phone ? (
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-[15px] font-medium inline-flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> {formatDigits(phone)}</p>
                        <button type="button" disabled={busy} onClick={remove} aria-label="Remover número de confiança" className="w-9 h-9 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center disabled:opacity-50">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <input
                            value={input} onChange={e => setInput(e.target.value)} placeholder="(11) 99999-9999" inputMode="tel"
                            className="flex-1 h-11 px-3 rounded-xl bg-foreground/[0.05] text-[16px] focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                        <button type="button" disabled={busy || !input.trim()} onClick={save} className="h-11 px-4 rounded-xl bg-primary text-primary-foreground text-[15px] font-semibold disabled:opacity-40 inline-flex items-center gap-2">
                            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Salvar
                        </button>
                    </div>
                )}
            </div>
        </section>
    )
}
