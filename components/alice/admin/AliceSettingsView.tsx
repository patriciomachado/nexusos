'use client'

import { useState } from 'react'
import { Check, X, Copy, Loader2, MessageCircle, Mic, Sparkles, ShieldCheck, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import RegisterNumber from './RegisterNumber'
import QrConnect from './QrConnect'
import Segmented from '@/components/ui/Segmented'

export interface SettingsPayload {
    settings: {
        enabled: boolean
        staff_roles: string[]
        store_info: string | null
        monthly_limit: number
        plan_limit?: number
        whatsapp_enabled: boolean
        whatsapp_phone_number_id: string | null
        whatsapp_display_phone: string | null
        whatsapp_verified_name: string | null
        whatsapp_token_set: boolean
        whatsapp_provider: 'cloud' | 'evolution' | 'zapi'
        whatsapp_gateway_url: string | null
        whatsapp_gateway_instance: string | null
        whatsapp_gateway_token_set: boolean
        whatsapp_gateway_client_token_set: boolean
        whatsapp_webhook_ready: boolean
    }
    usage: number
    environment: { ai: boolean; model: string; whatsappModel?: string; transcription: boolean; whatsappWebhook: boolean; webhookUrl: string; qrServer?: boolean }
}

const ROLE_OPTIONS = [
    { value: 'manager', label: 'Gerentes' },
    { value: 'technician', label: 'Técnicos' },
    { value: 'attendant', label: 'Atendentes' },
    { value: 'cashier', label: 'Caixas' },
    { value: 'talento', label: 'Talentos' },
]

async function save(patch: Record<string, unknown>) {
    const res = await fetch('/api/alice/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error ?? 'Não foi possível salvar.')
    return data.settings as SettingsPayload['settings']
}

export default function AliceSettingsView({ data, onSaved, onReload }: { data: SettingsPayload; onSaved: (d: SettingsPayload) => void; onReload?: () => void }) {
    const { settings, environment, usage } = data
    const [storeInfo, setStoreInfo] = useState(settings.store_info ?? '')
    const [limit, setLimit] = useState(String(settings.monthly_limit))
    const [phoneId, setPhoneId] = useState(settings.whatsapp_phone_number_id ?? '')
    const [token, setToken] = useState('')
    const [busy, setBusy] = useState<string | null>(null)

    const apply = async (key: string, patch: Record<string, unknown>, success = 'Salvo') => {
        setBusy(key)
        try {
            const next = await save(patch)
            onSaved({ ...data, settings: next })
            toast.success(success)
            return true
        } catch (err) {
            toast.error((err as Error).message)
            return false
        } finally {
            setBusy(null)
        }
    }

    const toggleRole = (role: string) => {
        const roles = settings.staff_roles.includes(role) ? settings.staff_roles.filter(r => r !== role) : [...settings.staff_roles, role]
        apply('roles', { staff_roles: roles })
    }

    const viaQr = settings.whatsapp_provider !== 'cloud'
    const waReady = viaQr ? settings.whatsapp_webhook_ready && !!settings.whatsapp_display_phone : settings.whatsapp_token_set && !!settings.whatsapp_phone_number_id

    const usagePct = settings.monthly_limit ? Math.min(100, Math.round((usage / settings.monthly_limit) * 100)) : 100

    return (
        <div className="grid lg:grid-cols-2 gap-5 items-start">
            {/* In-app assistant */}
            <section className="rounded-2xl bg-card border border-border/60 overflow-hidden">
                <header className="px-5 pt-5 pb-3 flex items-start gap-3">
                    <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 text-white flex items-center justify-center shrink-0"><Sparkles className="w-5 h-5" /></span>
                    <div className="min-w-0">
                        <h2 className="type-headline">Alice no app</h2>
                        <p className="text-[14px] text-muted-foreground">A equipe conversa e fala com a Alice pelo botão ✦ no topo. Consultas são imediatas; mudanças pedem confirmação.</p>
                    </div>
                </header>
                <ul className="px-5 pb-4 space-y-2">
                    <Check2 ok={environment.ai} label="Chave da IA" hint={environment.ai ? `App: ${environment.model}${environment.whatsappModel ? ` · WhatsApp: ${environment.whatsappModel}` : ''}` : 'Adicione ANTHROPIC_API_KEY na Vercel (console.anthropic.com → API Keys).'} />
                    <Check2 ok={environment.transcription} label="Comandos de voz com transcrição" hint={environment.transcription ? 'Ativo' : 'Opcional: adicione OPENAI_API_KEY (ou TRANSCRIBE_API_KEY) para a voz funcionar em todos os aparelhos e para entender áudios do WhatsApp. Sem ela, o app usa o reconhecimento de voz do próprio navegador quando disponível.'} warn />
                </ul>
                <div className="border-t border-border/60 px-5 py-4 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-[15px] font-medium">Liberar para a equipe</p>
                        <p className="text-[13px] text-muted-foreground">Administradores sempre têm acesso total.</p>
                    </div>
                    <Toggle checked={settings.enabled} busy={busy === 'enabled'} onChange={v => apply('enabled', { enabled: v })} label="Liberar para a equipe" />
                </div>
                {settings.enabled && (
                    <div className="border-t border-border/60 px-5 py-4 space-y-2">
                        <p className="text-[13px] text-muted-foreground">Quem pode usar (clientes, OS, agenda, estoque e aparelhos; sem financeiro e sem configurações):</p>
                        <div className="flex flex-wrap gap-2">
                            {ROLE_OPTIONS.map(r => {
                                const on = settings.staff_roles.includes(r.value)
                                return (
                                    <button key={r.value} type="button" disabled={busy === 'roles'} onClick={() => toggleRole(r.value)} aria-pressed={on}
                                        className={cn('h-9 px-3.5 rounded-full text-[14px] font-medium border transition-colors flex items-center gap-1.5', on ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent text-foreground border-border hover:bg-foreground/[0.04]')}>
                                        {on && <Check className="w-3.5 h-3.5" />}{r.label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}
                <div className="border-t border-border/60 px-5 py-4 space-y-2">
                    <div className="flex items-center justify-between text-[14px]">
                        <span className="font-medium">Uso neste mês</span>
                        <span className="text-muted-foreground tabular-nums">{usage.toLocaleString('pt-BR')} de {settings.monthly_limit.toLocaleString('pt-BR')} respostas</span>
                    </div>
                    <div className="h-2 rounded-full bg-foreground/[0.07] overflow-hidden"><div className={cn('h-full rounded-full', usagePct > 90 ? 'bg-red-500' : 'bg-primary')} style={{ width: `${usagePct}%` }} /></div>
                    <div className="flex items-center gap-2 pt-1">
                        <label htmlFor="alice-limit" className="text-[13px] text-muted-foreground">Limite mensal</label>
                        <input id="alice-limit" inputMode="numeric" value={limit} onChange={e => setLimit(e.target.value.replace(/\D/g, ''))} className="w-28 h-9 px-3 rounded-lg bg-foreground/[0.05] text-[15px] tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40" />
                        <button type="button" disabled={busy === 'limit' || Number(limit) === settings.monthly_limit || !limit} onClick={() => apply('limit', { monthly_limit: Number(limit) })} className="h-9 px-3 rounded-full text-[14px] font-semibold text-primary disabled:opacity-40">Salvar</button>
                    </div>
                    {!!settings.plan_limit && <p className="text-[13px] text-muted-foreground">Seu plano inclui até {settings.plan_limit.toLocaleString('pt-BR')} respostas por mês.</p>}
                </div>
            </section>

            {/* WhatsApp */}
            <section className="rounded-2xl bg-card border border-border/60 overflow-hidden">
                <header className="px-5 pt-5 pb-3 flex items-start gap-3">
                    <span className="w-10 h-10 rounded-xl bg-green-500 text-white flex items-center justify-center shrink-0"><MessageCircle className="w-5 h-5" /></span>
                    <div className="min-w-0 flex-1">
                        <h2 className="type-headline">Atendimento no WhatsApp</h2>
                        <p className="text-[14px] text-muted-foreground">A Alice responde clientes sobre o status dos serviços, a loja e os aparelhos à venda, e chama você quando precisar.</p>
                    </div>
                </header>
                <div className="border-t border-border/60 px-5 py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-[15px] font-medium">Alice responde no WhatsApp</p>
                        <p className="text-[13px] text-muted-foreground truncate">
                            {settings.whatsapp_display_phone ? `${settings.whatsapp_verified_name ?? 'Número'} · ${settings.whatsapp_display_phone}` : 'Conecte o número abaixo'}
                        </p>
                    </div>
                    <Toggle checked={settings.whatsapp_enabled} busy={busy === 'wa'} disabled={!waReady} onChange={v => apply('wa', { whatsapp_enabled: v }, v ? 'A Alice vai responder no WhatsApp' : 'WhatsApp pausado')} label="Alice responde no WhatsApp" />
                </div>

                <div className="border-t border-border/60 px-5 py-4 space-y-4">
                    <div className="space-y-1.5">
                        <p className="text-[15px] font-medium">Como conectar</p>
                        <Segmented<'qr' | 'cloud'>
                            value={viaQr ? 'qr' : 'cloud'}
                            onChange={v => apply('provider', { whatsapp_provider: v === 'qr' ? 'evolution' : 'cloud' }, v === 'qr' ? 'Conexão por QR Code escolhida' : 'API oficial escolhida')}
                            ariaLabel="Como conectar o WhatsApp"
                            className="w-full [&>button]:flex-1"
                            options={[{ value: 'qr', label: 'QR Code' }, { value: 'cloud', label: 'API oficial (Meta)' }]}
                        />
                        <p className="text-[13px] text-muted-foreground">
                            {viaQr ? 'Mais simples: lê o QR Code com o celular da loja e pronto. Conexão não oficial.' : 'Oficial e estável, mas exige app na Meta, número verificado e registro.'}
                        </p>
                    </div>
                    {viaQr ? (
                        <QrConnect
                            key={settings.whatsapp_provider + (settings.whatsapp_gateway_url ?? '') + (settings.whatsapp_gateway_instance ?? '')}
                            provider={settings.whatsapp_provider === 'zapi' ? 'zapi' : 'evolution'}
                            connectedPhone={settings.whatsapp_display_phone}
                            connectedName={settings.whatsapp_verified_name}
                            ready={settings.whatsapp_webhook_ready}
                            serverConfigured={!!environment.qrServer}
                            gatewayUrl={settings.whatsapp_gateway_url}
                            gatewayInstance={settings.whatsapp_gateway_instance}
                            tokenSet={settings.whatsapp_gateway_token_set}
                            clientTokenSet={settings.whatsapp_gateway_client_token_set}
                            busy={busy !== null}
                            onSave={(patch, msg) => apply('gateway', patch, msg)}
                            onChanged={() => onReload?.()}
                        />
                    ) : (
                    <div className="space-y-3">
                    <p className="text-[15px] font-medium">Passo a passo (uma vez só)</p>
                    <ol className="text-[14px] text-muted-foreground space-y-2 list-decimal pl-5">
                        <li>Em <a className="text-primary inline-flex items-center gap-0.5" href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer">developers.facebook.com <ExternalLink className="w-3 h-3" /></a>, crie um app do tipo <b>Empresa</b> e adicione o produto <b>WhatsApp</b>.</li>
                        <li>Em <b>WhatsApp → Configuração da API</b>, adicione e verifique o número da loja. Copie a <b>Identificação do número de telefone</b>.</li>
                        <li>No <b>Gerenciador de Negócios → Usuários do sistema</b>, crie um usuário administrador e gere um <b>token permanente</b> com as permissões <code>whatsapp_business_messaging</code> e <code>whatsapp_business_management</code>.</li>
                        <li>
                            Na Vercel, adicione <code>WHATSAPP_APP_SECRET</code> (app da Meta → Configurações → Básico → Chave secreta) e <code>WHATSAPP_VERIFY_TOKEN</code> (uma senha que você inventar).
                            <span className={cn('ml-1 inline-flex items-center gap-1 text-[12px] font-medium', environment.whatsappWebhook ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400')}>
                                {environment.whatsappWebhook ? <><Check className="w-3 h-3" /> configurado</> : 'pendente'}
                            </span>
                        </li>
                        <li>
                            Em <b>WhatsApp → Configuração → Webhook</b>, use a URL abaixo, o mesmo <code>WHATSAPP_VERIFY_TOKEN</code>, e assine o campo <b>messages</b>.
                            <CopyField value={environment.webhookUrl} />
                        </li>
                        <li>Cole a identificação e o token aqui, salve e ative o botão acima.</li>
                    </ol>
                    <form
                        className="space-y-2 pt-1"
                        onSubmit={async e => {
                            e.preventDefault()
                            const patch: Record<string, unknown> = { whatsapp_phone_number_id: phoneId.trim() || null }
                            if (token.trim()) patch.whatsapp_access_token = token.trim()
                            if (await apply('creds', patch, 'Número conectado e verificado com a Meta')) setToken('')
                        }}
                    >
                        <label className="block">
                            <span className="text-[13px] text-muted-foreground">Identificação do número de telefone</span>
                            <input value={phoneId} onChange={e => setPhoneId(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Ex.: 123456789012345" className="mt-1 w-full h-11 px-3 rounded-xl bg-foreground/[0.05] text-[16px] focus:outline-none focus:ring-2 focus:ring-primary/40" />
                        </label>
                        <label className="block">
                            <span className="text-[13px] text-muted-foreground">Token de acesso {settings.whatsapp_token_set && <span className="text-green-600 dark:text-green-400">(salvo — preencha só para trocar)</span>}</span>
                            <input value={token} onChange={e => setToken(e.target.value)} type="password" autoComplete="off" placeholder={settings.whatsapp_token_set ? '••••••••••••' : 'EAAG…'} className="mt-1 w-full h-11 px-3 rounded-xl bg-foreground/[0.05] text-[16px] focus:outline-none focus:ring-2 focus:ring-primary/40" />
                        </label>
                        <div className="flex items-center gap-2">
                            <button type="submit" disabled={busy === 'creds' || !phoneId || (!token && !settings.whatsapp_token_set)} className="h-10 px-4 rounded-full bg-primary text-primary-foreground text-[15px] font-semibold disabled:opacity-40 inline-flex items-center gap-2">
                                {busy === 'creds' && <Loader2 className="w-4 h-4 animate-spin" />} Salvar e verificar
                            </button>
                            {settings.whatsapp_token_set && (
                                <button type="button" onClick={() => apply('creds', { whatsapp_access_token: null, whatsapp_phone_number_id: null, whatsapp_enabled: false }, 'WhatsApp desconectado')} className="h-10 px-3 rounded-full text-[15px] text-red-600 dark:text-red-400">Desconectar</button>
                            )}
                        </div>
                        <p className="text-[12px] text-muted-foreground flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> O token fica só no servidor e nunca é exibido de novo.</p>
                    </form>
                    {settings.whatsapp_token_set && settings.whatsapp_phone_number_id && <RegisterNumber key={settings.whatsapp_phone_number_id} />}
                </div>

                    )}
                </div>

                <div className="border-t border-border/60 px-5 py-4 space-y-2">
                    <label htmlFor="store-info" className="text-[15px] font-medium">O que a Alice deve saber para atender</label>
                    <p className="text-[13px] text-muted-foreground">Horário, endereço, formas de pagamento, garantia, prazos médios, o que a loja não faz… A Alice usa só o que estiver aqui e no sistema.</p>
                    <textarea
                        id="store-info"
                        value={storeInfo}
                        onChange={e => setStoreInfo(e.target.value)}
                        rows={6}
                        maxLength={4000}
                        placeholder={'Ex.:\nAtendemos de segunda a sexta, 9h às 18h, e sábado até 13h.\nAceitamos Pix, dinheiro e cartão em até 10x.\nOrçamento gratuito; diagnóstico em até 24h.\nNão consertamos placa de notebook.'}
                        className="w-full px-3 py-2.5 rounded-xl bg-foreground/[0.05] text-[15px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <div className="flex justify-end">
                        <button type="button" disabled={busy === 'info' || storeInfo === (settings.store_info ?? '')} onClick={() => apply('info', { store_info: storeInfo.trim() || null })} className="h-10 px-4 rounded-full bg-primary/12 text-primary text-[15px] font-semibold disabled:opacity-40">Salvar informações</button>
                    </div>
                </div>
            </section>

            <section className="lg:col-span-2 rounded-2xl bg-card border border-border/60 px-5 py-4 flex gap-3">
                <Mic className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-[14px] text-muted-foreground">
                    <b className="text-foreground">Segurança:</b> a Alice age com as permissões de quem está falando com ela. Consultas são respondidas na hora; cadastrar, abrir OS, mudar status, agendar e criar tarefas só acontecem depois que a pessoa toca em <b>Confirmar</b>. No WhatsApp ela só enxerga os serviços do próprio cliente (pelo número) e nunca altera dados — pedidos viram tarefas para você. Tudo fica registrado na aba Atividade.
                </p>
            </section>
        </div>
    )
}

function Check2({ ok, label, hint, warn }: { ok: boolean; label: string; hint: string; warn?: boolean }) {
    return (
        <li className="flex gap-2.5">
            <span className={cn('mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0', ok ? 'bg-green-500 text-white' : warn ? 'bg-orange-500/15 text-orange-600' : 'bg-red-500/15 text-red-600')}>
                {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            </span>
            <div>
                <p className="text-[15px] font-medium leading-tight">{label}</p>
                <p className="text-[13px] text-muted-foreground">{hint}</p>
            </div>
        </li>
    )
}

function Toggle({ checked, onChange, busy, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; busy?: boolean; disabled?: boolean; label: string }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={busy || disabled}
            onClick={() => onChange(!checked)}
            className={cn('relative w-[51px] h-[31px] rounded-full transition-colors shrink-0 disabled:opacity-50', checked ? 'bg-green-500' : 'bg-foreground/15')}
        >
            <span className={cn('absolute top-[2px] left-[2px] w-[27px] h-[27px] rounded-full bg-white shadow transition-transform', checked && 'translate-x-5')} />
        </button>
    )
}

function CopyField({ value }: { value: string }) {
    return (
        <span className="mt-1.5 flex items-center gap-2 rounded-lg bg-foreground/[0.05] pl-3 pr-1 py-1">
            <code className="flex-1 min-w-0 truncate text-[13px] text-foreground">{value}</code>
            <button type="button" onClick={() => { navigator.clipboard?.writeText(value); toast.success('URL copiada') }} className="w-8 h-8 rounded-md flex items-center justify-center text-primary hover:bg-foreground/[0.05]" aria-label="Copiar URL">
                <Copy className="w-4 h-4" />
            </button>
        </span>
    )
}
