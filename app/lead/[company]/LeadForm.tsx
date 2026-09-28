'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2, MessageCircle, Send } from 'lucide-react'

function waLink(phone: string, companyName: string) {
    const d = phone.replace(/\D/g, '')
    const full = d.length <= 11 ? `55${d}` : d
    return `https://wa.me/${full}?text=${encodeURIComponent(`Olá! Acabei de mandar uma mensagem pelo site da ${companyName}.`)}`
}

export default function LeadForm({ companyId, companyPhone, companyName }: { companyId: string; companyPhone: string | null; companyName: string }) {
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [device, setDevice] = useState('')
    const [message, setMessage] = useState('')
    const [website, setWebsite] = useState('') // honeypot
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [sent, setSent] = useState(false)

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        if (name.trim().length < 2) { setError('Informe seu nome.'); return }
        if (phone.replace(/\D/g, '').length < 10) { setError('Informe um telefone com DDD.'); return }
        setBusy(true)
        try {
            const res = await fetch('/api/lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ company_id: companyId, name, phone, device, message, website }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.error || 'Não foi possível enviar agora.')
            setSent(true)
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setBusy(false)
        }
    }

    if (sent) {
        return (
            <div className="rounded-3xl border border-emerald-300/50 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-500/20 p-6 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600 dark:text-emerald-400" />
                <p className="text-[17px] font-semibold text-emerald-800 dark:text-emerald-300">Recebemos sua mensagem!</p>
                <p className="text-[14px] text-emerald-700/80 dark:text-emerald-400/80">A {companyName} vai te responder em breve.</p>
                {companyPhone && (
                    <a
                        href={waLink(companyPhone, companyName)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition"
                    >
                        <MessageCircle className="w-4 h-4" /> Continuar no WhatsApp
                    </a>
                )}
            </div>
        )
    }

    return (
        <form onSubmit={submit} className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12121a] shadow-sm p-5 space-y-4">
            <div className="hidden" aria-hidden="true">
                <label htmlFor="website">Não preencha este campo</label>
                <input id="website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} />
            </div>

            <div>
                <label htmlFor="lead-name" className="block text-[13px] text-slate-500 dark:text-slate-400 mb-1">Seu nome</label>
                <input
                    id="lead-name" value={name} onChange={e => setName(e.target.value)} placeholder="Nome completo"
                    className="w-full h-12 px-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[16px] outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
            </div>
            <div>
                <label htmlFor="lead-phone" className="block text-[13px] text-slate-500 dark:text-slate-400 mb-1">WhatsApp</label>
                <input
                    id="lead-phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999" inputMode="tel"
                    className="w-full h-12 px-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[16px] outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
            </div>
            <div>
                <label htmlFor="lead-device" className="block text-[13px] text-slate-500 dark:text-slate-400 mb-1">Aparelho (opcional)</label>
                <input
                    id="lead-device" value={device} onChange={e => setDevice(e.target.value)} placeholder="Ex.: iPhone 12"
                    className="w-full h-12 px-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[16px] outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
            </div>
            <div>
                <label htmlFor="lead-message" className="block text-[13px] text-slate-500 dark:text-slate-400 mb-1">Mensagem (opcional)</label>
                <textarea
                    id="lead-message" value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder="O que você precisa?"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[16px] outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
                />
            </div>

            {error && <p role="alert" className="text-[14px] text-red-600 dark:text-red-400">{error}</p>}

            <button
                type="submit" disabled={busy}
                className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-semibold shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition disabled:opacity-60"
            >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Enviar
            </button>
        </form>
    )
}
