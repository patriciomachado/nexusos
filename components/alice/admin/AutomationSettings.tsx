'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import Segmented from '@/components/ui/Segmented'
import type { SettingsPayload } from './AliceSettingsView'

type Settings = SettingsPayload['settings']
type WeekdayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

const WEEKDAYS: { key: WeekdayKey; label: string }[] = [
    { key: 'mon', label: 'Segunda' }, { key: 'tue', label: 'Terça' }, { key: 'wed', label: 'Quarta' },
    { key: 'thu', label: 'Quinta' }, { key: 'fri', label: 'Sexta' }, { key: 'sat', label: 'Sábado' }, { key: 'sun', label: 'Domingo' },
]

async function save(patch: Record<string, unknown>) {
    const res = await fetch('/api/alice/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error ?? 'Não foi possível salvar.')
    return data.settings as Settings
}

/** Tom de voz, emoji, palavras de escalonamento e horário de atendimento — como a Alice se comporta com o cliente. */
export default function AutomationSettings({ settings, onSaved }: { settings: Settings; onSaved: (s: Settings) => void }) {
    const [busy, setBusy] = useState<string | null>(null)
    const [toneCustom, setToneCustom] = useState(settings.tone_custom ?? '')
    const [keywordInput, setKeywordInput] = useState('')

    const apply = async (key: string, patch: Record<string, unknown>, success = 'Salvo') => {
        setBusy(key)
        try {
            const next = await save(patch)
            onSaved(next)
            toast.success(success)
        } catch (err) {
            toast.error((err as Error).message)
        } finally {
            setBusy(null)
        }
    }

    const addKeyword = () => {
        const kw = keywordInput.trim()
        if (!kw || settings.escalation_keywords.some(k => k.toLowerCase() === kw.toLowerCase())) { setKeywordInput(''); return }
        apply('kw', { escalation_keywords: [...settings.escalation_keywords, kw] })
        setKeywordInput('')
    }
    const removeKeyword = (kw: string) => apply('kw', { escalation_keywords: settings.escalation_keywords.filter(k => k !== kw) })

    const toggleDay = (key: WeekdayKey, on: boolean) => {
        const days = { ...settings.business_hours.days, [key]: on ? { open: '09:00', close: '18:00' } : null }
        apply('hours', { business_hours: { ...settings.business_hours, days } })
    }
    const setDayTime = (key: WeekdayKey, field: 'open' | 'close', value: string) => {
        const current = settings.business_hours.days[key] ?? { open: '09:00', close: '18:00' }
        const days = { ...settings.business_hours.days, [key]: { ...current, [field]: value } }
        apply('hours', { business_hours: { ...settings.business_hours, days } })
    }

    return (
        <section className="lg:col-span-2 rounded-2xl bg-card border border-border/60 overflow-hidden">
            <header className="px-5 pt-5 pb-3">
                <h2 className="type-headline">Estilo e automações</h2>
                <p className="text-[14px] text-muted-foreground">Como a Alice fala com o cliente, e quando ela chama um humano por conta própria.</p>
            </header>

            <div className="border-t border-border/60 px-5 py-4 space-y-2">
                <p className="text-[15px] font-medium">Tom de voz</p>
                <Segmented<Settings['tone']>
                    value={settings.tone}
                    onChange={v => apply('tone', { tone: v })}
                    ariaLabel="Tom de voz"
                    className="w-full [&>button]:flex-1"
                    options={[{ value: 'professional', label: 'Profissional' }, { value: 'friendly', label: 'Amigável' }, { value: 'casual', label: 'Descontraída' }, { value: 'custom', label: 'Personalizado' }]}
                />
                {settings.tone === 'custom' && (
                    <div className="flex items-center gap-2 pt-1">
                        <textarea
                            value={toneCustom} onChange={e => setToneCustom(e.target.value)} rows={2}
                            placeholder="Descreva o tom, ex.: use gírias, seja bem informal, chame o cliente pelo primeiro nome…"
                            className="flex-1 px-3 py-2.5 rounded-xl bg-foreground/[0.05] text-[15px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                        <button type="button" disabled={busy === 'tone_custom' || toneCustom === (settings.tone_custom ?? '')} onClick={() => apply('tone_custom', { tone_custom: toneCustom.trim() || null })} className="h-10 px-4 rounded-full bg-primary/12 text-primary text-[14px] font-semibold disabled:opacity-40 shrink-0">Salvar</button>
                    </div>
                )}
            </div>

            <div className="border-t border-border/60 px-5 py-4 space-y-2">
                <p className="text-[15px] font-medium">Uso de emoji</p>
                <Segmented<Settings['emoji_usage']>
                    value={settings.emoji_usage}
                    onChange={v => apply('emoji', { emoji_usage: v })}
                    ariaLabel="Uso de emoji"
                    className="w-full [&>button]:flex-1"
                    options={[{ value: 'none', label: 'Nenhum' }, { value: 'moderate', label: 'Moderado' }, { value: 'frequent', label: 'À vontade' }]}
                />
            </div>

            <div className="border-t border-border/60 px-5 py-4 space-y-2">
                <p className="text-[15px] font-medium">Palavras que chamam um atendente na hora</p>
                <p className="text-[13px] text-muted-foreground">Se a mensagem do cliente tiver uma dessas palavras, a Alice já chama alguém da equipe — sem depender só do julgamento dela.</p>
                {settings.escalation_keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                        {settings.escalation_keywords.map(kw => (
                            <span key={kw} className="h-8 pl-3 pr-1.5 rounded-full bg-foreground/[0.06] text-[14px] inline-flex items-center gap-1.5">
                                {kw}
                                <button type="button" onClick={() => removeKeyword(kw)} aria-label={`Remover ${kw}`} className="w-5 h-5 rounded-full bg-foreground/10 flex items-center justify-center hover:bg-foreground/20">
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}
                <div className="flex items-center gap-2 pt-1">
                    <input
                        value={keywordInput} onChange={e => setKeywordInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword() } }}
                        placeholder="Ex.: reclamação, procon, advogado"
                        className="flex-1 h-10 px-3 rounded-xl bg-foreground/[0.05] text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <button type="button" onClick={addKeyword} disabled={!keywordInput.trim()} className="h-10 px-4 rounded-full bg-foreground/[0.06] text-[14px] font-medium disabled:opacity-40">Adicionar</button>
                </div>
            </div>

            <div className="border-t border-border/60 px-5 py-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[15px] font-medium">Horário de atendimento</p>
                        <p className="text-[13px] text-muted-foreground">Fora do horário, a Alice avisa que está fechado em vez de agir como se estivesse aberta.</p>
                    </div>
                    <Toggle checked={settings.business_hours.enabled} busy={busy === 'hours_toggle'} onChange={v => apply('hours_toggle', { business_hours: { ...settings.business_hours, enabled: v } })} label="Horário de atendimento" />
                </div>
                {settings.business_hours.enabled && (
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            {WEEKDAYS.map(d => {
                                const hours = settings.business_hours.days[d.key]
                                return (
                                    <div key={d.key} className="flex items-center gap-2">
                                        <button type="button" onClick={() => toggleDay(d.key, !hours)} className={cn('w-[92px] h-9 rounded-full text-[13px] font-medium shrink-0', hours ? 'bg-primary/12 text-primary' : 'bg-foreground/[0.06] text-muted-foreground')}>{d.label}</button>
                                        {hours ? (
                                            <>
                                                <input type="time" defaultValue={hours.open} onBlur={e => e.target.value && setDayTime(d.key, 'open', e.target.value)} className="h-9 px-2 rounded-lg bg-foreground/[0.05] text-[14px] tabular-nums" />
                                                <span className="text-muted-foreground text-[13px]">até</span>
                                                <input type="time" defaultValue={hours.close} onBlur={e => e.target.value && setDayTime(d.key, 'close', e.target.value)} className="h-9 px-2 rounded-lg bg-foreground/[0.05] text-[14px] tabular-nums" />
                                            </>
                                        ) : <span className="text-[13px] text-muted-foreground">Fechado</span>}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </section>
    )
}

function Toggle({ checked, onChange, busy, label }: { checked: boolean; onChange: (v: boolean) => void; busy?: boolean; label: string }) {
    return (
        <button
            type="button" role="switch" aria-checked={checked} aria-label={label} disabled={busy}
            onClick={() => onChange(!checked)}
            className={cn('relative w-[51px] h-[31px] rounded-full transition-colors shrink-0 disabled:opacity-50', checked ? 'bg-green-500' : 'bg-foreground/15')}
        >
            <span className={cn('absolute top-[2px] left-[2px] w-[27px] h-[27px] rounded-full bg-white shadow transition-transform', checked && 'translate-x-5')} />
        </button>
    )
}
