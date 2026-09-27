'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, Loader2, QrCode, RefreshCw, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import Segmented from '@/components/ui/Segmented'
import PremiumConfirmDialog from '@/components/ui/PremiumConfirmDialog'

interface Props {
    provider: 'evolution' | 'zapi'
    connectedPhone: string | null
    connectedName: string | null
    ready: boolean
    serverConfigured: boolean
    gatewayUrl: string | null
    gatewayInstance: string | null
    tokenSet: boolean
    clientTokenSet: boolean
    busy: boolean
    onSave: (patch: Record<string, unknown>, success?: string) => Promise<boolean>
    onChanged: () => void
}

type State = { state: 'connected' | 'qr' | 'connecting' | 'disconnected'; qr?: string | null; phone?: string | null; name?: string | null }

async function call(method: 'GET' | 'POST', body?: unknown, qr = false): Promise<State> {
    const res = await fetch(`/api/alice/whatsapp/connection${qr ? '?qr=1' : ''}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error ?? 'Não foi possível falar com o WhatsApp.')
    return data
}

/**
 * The store's own WhatsApp number, linked like WhatsApp Web: tap Conectar,
 * scan the QR code on the phone, done. Uses the app's WhatsApp server by
 * default; Evolution API or Z-API can be set under "Outro serviço".
 */
export default function QrConnect(p: Props) {
    const [st, setSt] = useState<State | null>(null)
    const [loading, setLoading] = useState(false)
    const [advanced, setAdvanced] = useState(p.provider === 'zapi' || !!p.gatewayUrl || !p.serverConfigured)
    const [kind, setKind] = useState<'own' | 'evolution' | 'zapi'>(p.provider === 'zapi' ? 'zapi' : p.gatewayUrl ? 'evolution' : 'own')
    const [url, setUrl] = useState(p.gatewayUrl ?? '')
    const [instance, setInstance] = useState(p.gatewayInstance ?? '')
    const [token, setToken] = useState('')
    const [clientToken, setClientToken] = useState('')
    const polling = useRef<ReturnType<typeof setInterval> | null>(null)
    const onChanged = p.onChanged

    const stop = () => { if (polling.current) clearInterval(polling.current); polling.current = null }

    const refresh = useCallback(async (withQr: boolean) => {
        try {
            const next = await call('GET', undefined, withQr)
            setSt(prev => (withQr || next.state === 'connected' || !prev?.qr ? next : { ...next, qr: prev.qr }))
            if (next.state === 'connected') {
                stop()
                onChanged()
            }
            return next
        } catch (err) {
            stop()
            toast.error((err as Error).message)
            return null
        }
    }, [onChanged])

    // Current state when the screen opens.
    useEffect(() => {
        if (p.ready) refresh(false)
        return stop
    }, [p.ready, refresh])

    const connect = async () => {
        setLoading(true)
        try {
            const next = await call('POST', { action: 'connect' })
            setSt(next)
            if (next.state === 'connected') { toast.success('WhatsApp conectado'); onChanged(); return }
            stop()
            let ticks = 0
            // Check every 4s; a new QR code every ~20s (they expire).
            polling.current = setInterval(async () => {
                ticks++
                const r = await refresh(ticks % 5 === 0)
                if (r?.state === 'connected') toast.success('WhatsApp conectado')
                if (ticks > 75) { stop(); setSt(s => s && s.state !== 'connected' ? { ...s, qr: null } : s) }
            }, 4000)
        } catch (err) {
            toast.error((err as Error).message)
        } finally {
            setLoading(false)
        }
    }

    const [confirmDisconnect, setConfirmDisconnect] = useState(false)
    const disconnect = async () => {
        setConfirmDisconnect(false)
        setLoading(true)
        try {
            setSt(await call('POST', { action: 'disconnect' }))
            stop()
            onChanged()
            toast.success('WhatsApp desconectado')
        } catch (err) {
            toast.error((err as Error).message)
        } finally {
            setLoading(false)
        }
    }

    const saveService = async () => {
        const patch: Record<string, unknown> = kind === 'own'
            ? { whatsapp_provider: 'evolution', whatsapp_gateway_url: null, whatsapp_gateway_instance: null, whatsapp_gateway_token: null }
            : kind === 'evolution'
                ? { whatsapp_provider: 'evolution', whatsapp_gateway_url: url.trim(), whatsapp_gateway_instance: instance.trim() || null, ...(token.trim() ? { whatsapp_gateway_token: token.trim() } : {}) }
                : { whatsapp_provider: 'zapi', whatsapp_gateway_url: null, whatsapp_gateway_instance: instance.trim(), ...(token.trim() ? { whatsapp_gateway_token: token.trim() } : {}), ...(clientToken.trim() ? { whatsapp_gateway_client_token: clientToken.trim() } : {}) }
        if (await p.onSave(patch, 'Serviço salvo. Agora toque em Conectar.')) { setToken(''); setClientToken(''); setSt(null) }
    }

    const connected = st?.state === 'connected' || (!st && !!p.connectedPhone && p.ready)
    const phone = st?.phone ? st.phone : null
    const canConnect = p.provider === 'zapi' ? !!p.gatewayInstance && p.tokenSet : (p.serverConfigured || (!!p.gatewayUrl && p.tokenSet))

    return (
        <div className="space-y-4">
            <PremiumConfirmDialog
                isOpen={confirmDisconnect}
                title="Desconectar o WhatsApp?"
                description="A Alice para de responder. Para voltar, é preciso ler o QR Code de novo."
                confirmLabel="Desconectar"
                onConfirm={disconnect}
                onCancel={() => setConfirmDisconnect(false)}
            />
            {connected ? (
                <div className="rounded-xl bg-green-500/10 px-4 py-3 flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-semibold">Conectado</p>
                        <p className="text-[13px] text-muted-foreground truncate">{[st?.name ?? p.connectedName, p.connectedPhone ?? phone].filter(Boolean).join(' · ') || 'Número da loja'}</p>
                    </div>
                    <button type="button" onClick={() => setConfirmDisconnect(true)} disabled={loading} className="h-9 px-3 rounded-full text-[14px] text-red-600 dark:text-red-400 hover:bg-red-500/10 disabled:opacity-50">Desconectar</button>
                </div>
            ) : st?.state === 'qr' && st.qr ? (
                <div className="rounded-xl bg-foreground/[0.03] p-4 flex flex-col sm:flex-row items-center gap-5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img width={224} height={224} src={st.qr} alt="QR Code para conectar o WhatsApp" className="w-56 h-56 rounded-lg bg-white p-2 shrink-0" />
                    <ol className="text-[14px] text-muted-foreground space-y-1.5 list-decimal pl-5">
                        <li>No celular da loja, abra o <b className="text-foreground">WhatsApp</b>.</li>
                        <li>Toque em <b className="text-foreground">Configurações</b> (iPhone) ou <b className="text-foreground">⋮</b> (Android) → <b className="text-foreground">Dispositivos conectados</b>.</li>
                        <li>Toque em <b className="text-foreground">Conectar dispositivo</b> e aponte para este código.</li>
                        <li className="list-none -ml-5 pt-1 flex items-center gap-1.5 text-[13px]"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Esperando a leitura… o código se renova sozinho.</li>
                    </ol>
                </div>
            ) : (
                <div className="rounded-xl bg-foreground/[0.03] px-4 py-5 text-center space-y-3">
                    <QrCode className="w-10 h-10 mx-auto text-muted-foreground" />
                    <p className="text-[14px] text-muted-foreground">
                        {st?.state === 'connecting' ? 'Conectando… se demorar, gere um novo código.' : 'Conecte o número da loja lendo um QR Code, como no WhatsApp Web.'}
                    </p>
                    <button type="button" onClick={connect} disabled={loading || !canConnect || p.busy} className="h-11 px-5 rounded-full bg-green-600 text-white text-[15px] font-semibold inline-flex items-center gap-2 disabled:opacity-40">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : st?.state === 'connecting' ? <RefreshCw className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                        {st?.state === 'connecting' ? 'Gerar novo código' : 'Conectar'}
                    </button>
                    {!canConnect && (
                        <p className="text-[13px] text-orange-600 dark:text-orange-400">
                            {p.provider === 'zapi' ? 'Preencha os dados da Z-API abaixo.' : 'O servidor do WhatsApp do app ainda não está no ar. Veja em "Outro serviço" ou configure o servidor (whatsapp-server/LEIA-ME.md).'}
                        </p>
                    )}
                </div>
            )}

            <p className="text-[12px] text-muted-foreground flex gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-orange-500" />
                Conexão não oficial (a mesma do WhatsApp Web). Use o número da loja, não mande mensagens em massa e mantenha o celular com internet de vez em quando: o WhatsApp pode desconectar ou bloquear números usados para spam.
            </p>

            <div className="rounded-xl border border-border/60">
                <button type="button" onClick={() => setAdvanced(a => !a)} aria-expanded={advanced} className="w-full px-4 h-11 flex items-center justify-between text-[14px] font-medium">
                    Outro serviço (avançado)
                    <ChevronDown className={cn('w-4 h-4 transition-transform', advanced && 'rotate-180')} />
                </button>
                {advanced && (
                    <div className="px-4 pb-4 space-y-3">
                        <Segmented<'own' | 'evolution' | 'zapi'>
                            value={kind}
                            onChange={setKind}
                            ariaLabel="Serviço de conexão"
                            size="sm"
                            className="w-full [&>button]:flex-1"
                            options={[{ value: 'own', label: 'Servidor do app' }, { value: 'evolution', label: 'Evolution API' }, { value: 'zapi', label: 'Z-API' }]}
                        />
                        {kind === 'own' && <p className="text-[13px] text-muted-foreground">Usa o servidor de WhatsApp do próprio Nexus OS ({p.serverConfigured ? 'no ar' : 'ainda não configurado'}).</p>}
                        {kind === 'evolution' && (
                            <>
                                <Input label="Endereço do servidor" value={url} onChange={setUrl} placeholder="https://evolution.suaempresa.com" />
                                <Input label="Nome da instância (opcional)" value={instance} onChange={setInstance} placeholder="loja" />
                                <Input label={`API key${p.tokenSet ? ' (salva — preencha só para trocar)' : ''}`} value={token} onChange={setToken} secret />
                            </>
                        )}
                        {kind === 'zapi' && (
                            <>
                                <Input label="ID da instância" value={instance} onChange={setInstance} placeholder="3C…" />
                                <Input label={`Token da instância${p.tokenSet ? ' (salvo)' : ''}`} value={token} onChange={setToken} secret />
                                <Input label={`Token de segurança da conta${p.clientTokenSet ? ' (salvo)' : ' (se ativado)'}`} value={clientToken} onChange={setClientToken} secret />
                            </>
                        )}
                        <button type="button" onClick={saveService} disabled={p.busy || (kind === 'evolution' && !url.trim()) || (kind === 'zapi' && !instance.trim())} className="h-10 px-4 rounded-full bg-primary/12 text-primary text-[15px] font-semibold disabled:opacity-40">
                            Salvar serviço
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

function Input({ label, value, onChange, placeholder, secret }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; secret?: boolean }) {
    return (
        <label className="block">
            <span className="text-[13px] text-muted-foreground">{label}</span>
            <input
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder ?? (secret ? '••••••••' : undefined)}
                type={secret ? 'password' : 'text'}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                className="mt-1 w-full h-11 px-3 rounded-xl bg-foreground/[0.05] text-[16px] focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
        </label>
    )
}
