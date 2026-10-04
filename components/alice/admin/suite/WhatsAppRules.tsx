'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import Segmented from '@/components/ui/Segmented'
import type { SettingsPayload } from '../AliceSettingsView'
import { api, Button, fieldCls, FieldRow, Toggle } from './ui'

type Settings = SettingsPayload['settings']

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
    return (
        <div className="border-t border-border/60 px-5 py-4 flex items-center gap-4">
            <div className="min-w-0 flex-1"><p className="text-[15px] font-medium">{title}</p>{hint && <p className="text-[13px] text-muted-foreground">{hint}</p>}</div>
            {children}
        </div>
    )
}

/** Regras do WhatsApp (inspiradas no WA-AKG): boas-vindas, quem recebe respostas automáticas, anti-spam, presença e comandos do bot. */
export default function WhatsAppRules({ settings, onSaved }: { settings: Settings; onSaved: (s: Settings) => void }) {
    const [busy, setBusy] = useState<string | null>(null)
    const [welcome, setWelcome] = useState(settings.welcome_message ?? '')
    const [numbers, setNumbers] = useState(settings.autoreply_numbers.join('\n'))
    const [prefix, setPrefix] = useState(settings.bot_prefix)

    const apply = async (key: string, patch: Record<string, unknown>, success = 'Salvo') => {
        setBusy(key)
        try {
            const r = await api<{ settings: Settings }>('/api/alice/settings', { method: 'PUT', body: patch })
            onSaved(r.settings)
            toast.success(success)
        } catch (err) {
            toast.error((err as Error).message)
        } finally {
            setBusy(null)
        }
    }

    const saveNumbers = () => apply('numbers', { autoreply_numbers: numbers.split(/[\n,;]+/).map(n => n.replace(/\D/g, '')).filter(Boolean) })
    const seconds = (ms: number) => Math.round(ms / 100) / 10

    return (
        <section className="lg:col-span-2 rounded-2xl bg-card border border-border/60 overflow-hidden">
            <header className="px-5 pt-5 pb-3">
                <h2 className="type-headline">Regras do WhatsApp</h2>
                <p className="text-[14px] text-muted-foreground">Boas-vindas, quem recebe respostas automáticas, proteção contra spam e comandos. Valem para a conexão por QR Code.</p>
            </header>

            <div className="border-t border-border/60 px-5 py-4 space-y-2">
                <FieldRow label="Mensagem de boas-vindas (primeiro contato)" hint="Enviada quando um número novo escreve. Se ele só disser “oi”, a boas-vindas responde sozinha; se já perguntar algo, a Alice responde em seguida.">
                    <textarea value={welcome} onChange={e => setWelcome(e.target.value)} rows={3} maxLength={1000} placeholder="Olá! Você está falando com a loja…" className={fieldCls} />
                </FieldRow>
                <Button variant="soft" busy={busy === 'welcome'} disabled={welcome.trim() === (settings.welcome_message ?? '')} onClick={() => apply('welcome', { welcome_message: welcome.trim() || null })}>Salvar boas-vindas</Button>
            </div>

            <div className="border-t border-border/60 px-5 py-4 space-y-3">
                <p className="text-[15px] font-medium">Quem recebe respostas automáticas</p>
                <Segmented<Settings['autoreply_mode']> value={settings.autoreply_mode} onChange={v => apply('mode', { autoreply_mode: v })} ariaLabel="Quem recebe respostas automáticas" className="w-full [&>button]:flex-1"
                    options={[{ value: 'all', label: 'Todos' }, { value: 'whitelist', label: 'Só a lista' }, { value: 'blacklist', label: 'Todos, menos a lista' }]} />
                {settings.autoreply_mode !== 'all' && (
                    <>
                        <FieldRow label="Números da lista (um por linha, com DDD)"><textarea value={numbers} onChange={e => setNumbers(e.target.value)} rows={3} placeholder={'5548999999999'} className={fieldCls} /></FieldRow>
                        <Button variant="soft" busy={busy === 'numbers'} onClick={saveNumbers}>Salvar lista</Button>
                    </>
                )}
            </div>

            <Row title="Proteção contra spam" hint="Se um número mandar mensagens demais em poucos segundos, a Alice para de responder a ele por um momento.">
                <Toggle checked={settings.antispam_enabled} onChange={v => apply('spam', { antispam_enabled: v })} label="Proteção contra spam" disabled={busy === 'spam'} />
            </Row>
            {settings.antispam_enabled && (
                <div className="px-5 pb-4 grid grid-cols-2 gap-3">
                    <FieldRow label="Máx. de mensagens"><input type="number" min={1} max={100} defaultValue={settings.antispam_limit} onBlur={e => { const v = Number(e.target.value); if (v >= 1 && v !== settings.antispam_limit) apply('limit', { antispam_limit: v }) }} className={fieldCls} /></FieldRow>
                    <FieldRow label="Em quantos segundos"><input type="number" min={1} max={3600} defaultValue={settings.antispam_window_seconds} onBlur={e => { const v = Number(e.target.value); if (v >= 1 && v !== settings.antispam_window_seconds) apply('window', { antispam_window_seconds: v }) }} className={fieldCls} /></FieldRow>
                </div>
            )}

            <div className="border-t border-border/60 px-5 py-4 space-y-2">
                <p className="text-[15px] font-medium">Pausa antes de responder</p>
                <p className="text-[13px] text-muted-foreground">Uma espera aleatória deixa a conversa mais natural e reduz o risco de bloqueio. 0 = responde na hora.</p>
                <div className="grid grid-cols-2 gap-3">
                    <FieldRow label="Mínima (segundos)"><input type="number" min={0} max={30} step={0.5} defaultValue={seconds(settings.reply_delay_min_ms)} onBlur={e => { const ms = Math.round(Number(e.target.value) * 1000); if (ms >= 0 && ms !== settings.reply_delay_min_ms) apply('dmin', { reply_delay_min_ms: ms, ...(ms > settings.reply_delay_max_ms ? { reply_delay_max_ms: ms } : {}) }) }} className={fieldCls} /></FieldRow>
                    <FieldRow label="Máxima (segundos)"><input type="number" min={0} max={60} step={0.5} defaultValue={seconds(settings.reply_delay_max_ms)} onBlur={e => { const ms = Math.round(Number(e.target.value) * 1000); if (ms >= 0 && ms !== settings.reply_delay_max_ms) apply('dmax', { reply_delay_max_ms: ms }) }} className={fieldCls} /></FieldRow>
                </div>
            </div>

            <Row title="Marcar como lida automaticamente" hint="Os dois tracinhos azuis aparecem para o cliente assim que a Alice começa a atender."><Toggle checked={settings.auto_read} onChange={v => apply('read', { auto_read: v })} label="Marcar como lida" disabled={busy === 'read'} /></Row>
            <Row title="Sempre online" hint="Mantém o número da loja aparecendo “online” enquanto o servidor está conectado."><Toggle checked={settings.always_online} onChange={v => apply('online', { always_online: v })} label="Sempre online" disabled={busy === 'online'} /></Row>

            <Row title="Comandos do bot" hint="Ex.: #ping, #figurinha, #ajuda. Por padrão só os números cadastrados da equipe podem usar."><Toggle checked={settings.bot_commands_enabled} onChange={v => apply('cmd', { bot_commands_enabled: v })} label="Comandos do bot" disabled={busy === 'cmd'} /></Row>
            {settings.bot_commands_enabled && (
                <div className="px-5 pb-4 space-y-3">
                    <Segmented<Settings['bot_commands_mode']> value={settings.bot_commands_mode} onChange={v => apply('cmdmode', { bot_commands_mode: v })} ariaLabel="Quem pode usar comandos" className="w-full [&>button]:flex-1" options={[{ value: 'trusted', label: 'Só a equipe cadastrada' }, { value: 'all', label: 'Qualquer pessoa' }]} />
                    <div className="flex items-end gap-2">
                        <div className="flex-1"><FieldRow label="Prefixo (1 ou 2 símbolos)"><input value={prefix} onChange={e => setPrefix(e.target.value)} maxLength={2} className={fieldCls} /></FieldRow></div>
                        <Button variant="soft" busy={busy === 'prefix'} disabled={prefix === settings.bot_prefix || !prefix.trim()} onClick={() => apply('prefix', { bot_prefix: prefix.trim() })}>Salvar</Button>
                    </div>
                </div>
            )}
        </section>
    )
}
