'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api, Button, fieldCls, FieldRow, Panel, Toggle } from './suite/ui'
import type { SettingsPayload } from './AliceSettingsView'
import { normalizeAutomations, type Automations } from '@/lib/customers/templates'

type Settings = SettingsPayload['settings']

type TextKey = 'os_tracking_text' | 'os_ready_text' | 'birthday_text' | 'review_text' | 'appointment_text'

const MESSAGES: { key: TextKey; flag?: 'os_ready' | 'birthday' | 'review' | 'appointment_reminder'; title: string; hint: string; vars: string }[] = [
    { key: 'os_tracking_text', title: 'Botão “Enviar OS” ao cliente', hint: 'Texto que já vai pronto no chat quando você toca em WhatsApp dentro de uma ordem.', vars: '{nome} {os} {link} {loja}' },
    { key: 'os_ready_text', flag: 'os_ready', title: 'Aviso de aparelho pronto', hint: 'Enviado sozinho quando a ordem é marcada como concluída.', vars: '{nome} {aparelho} {os} {valor} {loja} {endereco} {link}' },
    { key: 'appointment_text', flag: 'appointment_reminder', title: 'Lembrete de agendamento', hint: 'Enviado antes do horário marcado na agenda.', vars: '{nome} {loja} {data} {hora} {servico}' },
    { key: 'birthday_text', flag: 'birthday', title: 'Parabéns no aniversário', hint: 'Enviado às 10h no aniversário do cliente.', vars: '{nome} {loja}' },
    { key: 'review_text', flag: 'review', title: 'Pedido de avaliação (pós-venda)', hint: 'Enviado alguns dias depois da entrega. Precisa do link do Google em Configurações → Loja.', vars: '{nome} {aparelho} {link} {loja}' },
]

/** Liga/desliga das automações mais complexas e todas as mensagens automáticas em caixas de texto editáveis. */
export default function AutomationMessages({ settings, onSaved }: { settings: Settings; onSaved: (s: Settings) => void }) {
    const [auto, setAuto] = useState<Automations | null>(null)
    const [draft, setDraft] = useState<Automations | null>(null)
    const [welcome, setWelcome] = useState(settings.welcome_message ?? '')
    const [afterHours, setAfterHours] = useState(settings.business_hours.after_hours_message ?? '')
    const [canEdit, setCanEdit] = useState(true)
    const [busy, setBusy] = useState<string | null>(null)

    useEffect(() => {
        api<Automations & { can_edit?: boolean }>('/api/customers/automations')
            .then(d => { const n = normalizeAutomations(d); setAuto(n); setDraft(n); setCanEdit(d.can_edit !== false) })
            .catch(() => { const n = normalizeAutomations(null); setAuto(n); setDraft(n); setCanEdit(false) })
    }, [])

    const persist = async (key: string, patch: Partial<Automations>, success = 'Salvo') => {
        setBusy(key)
        try {
            const next = normalizeAutomations(await api<Automations>('/api/customers/automations', { method: 'PUT', body: patch }))
            setAuto(next); setDraft(d => (d ? { ...d, ...patch } : next))
            toast.success(success)
        } catch (err) {
            toast.error((err as Error).message)
        } finally {
            setBusy(null)
        }
    }

    const saveAlice = async (key: string, patch: Record<string, unknown>) => {
        setBusy(key)
        try {
            const r = await api<{ settings: Settings }>('/api/alice/settings', { method: 'PUT', body: patch })
            onSaved(r.settings)
            toast.success('Salvo')
        } catch (err) {
            toast.error((err as Error).message)
        } finally {
            setBusy(null)
        }
    }

    const switches: { flag: 'alice_os' | 'alice_quotes'; title: string; hint: string }[] = [
        { flag: 'alice_os', title: 'Alice mexe em ordens de serviço', hint: 'Abrir OS, mudar status, anotar e passar para um técnico. Toda ação continua pedindo sua confirmação.' },
        { flag: 'alice_quotes', title: 'Alice faz orçamentos e cotações', hint: 'Criar orçamentos e calcular o valor de reparos/peças. Desligado, ela deixa isso para a equipe.' },
    ]

    return (
        <Panel className="lg:col-span-2" title="Automações e mensagens" description="Ligue ou desligue o que a Alice faz sozinha e escreva do seu jeito cada mensagem enviada ao cliente.">
            {!canEdit && <p className="px-5 pb-3 text-[13px] text-muted-foreground">Só o proprietário pode alterar estas opções.</p>}
            {!auto || !draft ? <div className="mx-5 mb-5 h-32 animate-pulse rounded-2xl bg-foreground/[0.04]" /> : (
                <>
                    {switches.map(s => (
                        <div key={s.flag} className="border-t border-border/60 px-5 py-4 flex items-center gap-4">
                            <div className="min-w-0 flex-1"><p className="text-[15px] font-medium">{s.title}</p><p className="text-[13px] text-muted-foreground">{s.hint}</p></div>
                            <Toggle checked={auto[s.flag]} disabled={!canEdit || busy === s.flag} label={s.title} onChange={v => persist(s.flag, { [s.flag]: v }, v ? 'Ligado' : 'Desligado')} />
                        </div>
                    ))}

                    {MESSAGES.map(m => (
                        <div key={m.key} className="border-t border-border/60 px-5 py-4 space-y-2">
                            <div className="flex items-center gap-4">
                                <div className="min-w-0 flex-1"><p className="text-[15px] font-medium">{m.title}</p><p className="text-[13px] text-muted-foreground">{m.hint}</p></div>
                                {m.flag && <Toggle checked={auto[m.flag]} disabled={!canEdit || busy === m.flag} label={m.title} onChange={v => persist(m.flag!, { [m.flag!]: v }, v ? 'Ligado' : 'Desligado')} />}
                            </div>
                            <FieldRow label="Mensagem" hint={`Variáveis: ${m.vars}`}>
                                <textarea value={draft[m.key]} onChange={e => setDraft({ ...draft, [m.key]: e.target.value })} rows={3} maxLength={800} disabled={!canEdit} className={fieldCls} />
                            </FieldRow>
                            <Button variant="soft" busy={busy === m.key} disabled={!canEdit || draft[m.key].trim() === auto[m.key]} onClick={() => persist(m.key, { [m.key]: draft[m.key].trim() })}>Salvar mensagem</Button>
                        </div>
                    ))}
                </>
            )}

            <div className="border-t border-border/60 px-5 py-4 space-y-2">
                <FieldRow label="Boas-vindas (primeiro contato)" hint="Enviada quando um número novo escreve. Se ele só disser “oi”, a boas-vindas responde sozinha; se já perguntar algo, a Alice responde em seguida.">
                    <textarea value={welcome} onChange={e => setWelcome(e.target.value)} rows={3} maxLength={1000} placeholder="Olá! Você está falando com a loja…" className={fieldCls} />
                </FieldRow>
                <Button variant="soft" busy={busy === 'welcome'} disabled={welcome.trim() === (settings.welcome_message ?? '')} onClick={() => saveAlice('welcome', { welcome_message: welcome.trim() || null })}>Salvar boas-vindas</Button>
            </div>

            <div className="border-t border-border/60 px-5 py-4 space-y-2">
                <FieldRow label="Mensagem fora do horário" hint={settings.business_hours.enabled ? undefined : 'Ative “Horário de atendimento” abaixo para ela ser usada.'}>
                    <textarea value={afterHours} onChange={e => setAfterHours(e.target.value)} rows={2} maxLength={600} placeholder="Ex.: No momento estamos fechados! Voltamos amanhã às 9h." className={fieldCls} />
                </FieldRow>
                <Button variant="soft" busy={busy === 'after'} disabled={afterHours.trim() === (settings.business_hours.after_hours_message ?? '')} onClick={() => saveAlice('after', { business_hours: { ...settings.business_hours, after_hours_message: afterHours.trim() || null } })}>Salvar mensagem</Button>
            </div>
        </Panel>
    )
}
