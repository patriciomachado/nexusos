'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save, ShieldCheck, Sparkles, Loader2, Key, Link as LinkIcon, RefreshCw, Copy, Check, Info } from 'lucide-react'
import { PremiumInput } from '@/components/ui/PremiumInput'

interface Props {
    company: any
    companyId: string
}

export default function AliceIntegrationSettings({ company, companyId }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [isSyncing, setIsSyncing] = useState(false)
    const [origin, setOrigin] = useState('')
    const [copied, setCopied] = useState(false)

    // Form State
    const [active, setActive] = useState(company?.alice_active ?? false)
    const [token, setToken] = useState(company?.alice_token ?? '')
    const [syncUrl, setSyncUrl] = useState(company?.alice_sync_url ?? 'https://aliceinteligence.com/api/integrations/nexus/sync')

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setOrigin(window.location.origin)
        }
    }, [])

    const apiOsUrl = `${origin}/api/os`

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(apiOsUrl)
            setCopied(true)
            toast.success('URL copiada para a área de transferência!')
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            toast.error('Erro ao copiar URL.')
        }
    }

    const generateToken = () => {
        const randomBytes = crypto.getRandomValues(new Uint8Array(24))
        const rand = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')
        const newKey = `nexus_sec_key_${rand}`
        setToken(newKey)
        toast.info('Nova chave de segurança gerada! Salve as alterações.')
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault()
        startTransition(async () => {
            const res = await fetch(`/api/company/${companyId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    alice_active: active,
                    alice_token: token || null,
                    alice_sync_url: syncUrl || null
                }),
            })
            if (res.ok) {
                toast.success('Configurações da Alice AI atualizadas!')
                router.refresh()
            } else {
                toast.error('Ocorreu um erro ao salvar as configurações.')
            }
        })
    }

    async function handleSyncCatalog() {
        if (!active) {
            toast.error('Ative a integração e salve antes de sincronizar o catálogo.')
            return
        }
        if (!token || !syncUrl) {
            toast.error('Configure a chave de acesso e a URL de sincronização antes.')
            return
        }

        setIsSyncing(true)
        try {
            const res = await fetch('/api/integrations/alice/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })

            const data = await res.json()
            if (res.ok && data.success) {
                toast.success(data.message || 'Catálogo sincronizado com sucesso!')
            } else {
                toast.error(data.error || 'Erro na sincronização com a Alice AI.')
            }
        } catch (error) {
            toast.error('Erro de conexão com o servidor.')
        } finally {
            setIsSyncing(false)
        }
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6">
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-1 bg-violet-500 rounded-full" />
                        <span className="text-[11px] font-black uppercase tracking-wider text-violet-500/60">Agente Inteligente de IA</span>
                    </div>
                    <h2 className="text-3xl font-black text-foreground tracking-tighter">Integração Alice AI</h2>
                    <p className="text-muted-foreground font-medium text-sm leading-relaxed max-w-xl">
                        Conecte a atendente virtual Alice AI ao seu ERP Nexus para permitir consultas de Ordens de Serviço por WhatsApp em tempo real e sincronizar seu catálogo de prazos de reparo.
                    </p>
                </div>
            </div>

            <div className="p-10 rounded-3xl bg-card/40 border border-white/5 backdrop-blur-3xl shadow-2xl relative overflow-hidden group transition-all duration-500 hover:border-violet-500/20">
                <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/3 group-hover:bg-violet-500/10 transition-colors duration-700 pointer-events-none" />
                
                <form onSubmit={handleSave} className="space-y-8 relative z-10">
                    {/* Toggle Switch */}
                    <div className="flex items-center justify-between p-6 rounded-3xl bg-violet-500/5 border border-violet-500/10">
                        <div className="space-y-1">
                            <span className="text-sm font-bold text-foreground">Status da Integração</span>
                            <p className="text-xs text-muted-foreground">Ative para expor a rota pública e liberar a comunicação bidirecional.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={active}
                                onChange={(e) => setActive(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-14 h-8 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:height-6 after:w-6 after:transition-all peer-checked:bg-violet-500"></div>
                        </label>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* URL da API (Read only) */}
                        <div className="space-y-3">
                            <label className="block text-[13px] font-medium text-muted-foreground ml-2">
                                URL da API do Nexus (Alice ➔ Nexus)
                            </label>
                            <div className="relative flex items-center">
                                <PremiumInput
                                    name="api_os_url"
                                    value={apiOsUrl}
                                    readOnly
                                    icon={<LinkIcon className="w-4 h-4 text-violet-500" />}
                                    className="pr-12 bg-background/30 font-mono text-xs select-all cursor-default"
                                />
                                <button
                                    type="button"
                                    onClick={handleCopy}
                                    className="absolute right-3 p-2 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                                    title="Copiar URL"
                                >
                                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                            <span className="text-[11px] font-medium text-muted-foreground block ml-2">
                                Configure esta URL no card <strong>Integração Nexus ERP</strong> no painel de administração da Alice.
                            </span>
                        </div>

                        {/* Chave de Segurança */}
                        <div className="space-y-3">
                            <label className="block text-[13px] font-medium text-muted-foreground ml-2">
                                Chave de Acesso (API Key / Bearer Token)
                            </label>
                            <div className="relative flex items-center">
                                <PremiumInput
                                    name="alice_token"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    placeholder="Ex: nexus_sec_key_2026_xyz"
                                    icon={<Key className="w-4 h-4 text-violet-500" />}
                                    className="pr-24"
                                />
                                <button
 type="button"
 onClick={generateToken}
 className="absolute right-2 px-3 py-1.5 bg-violet-500/10 text-violet-500 hover:bg-violet-500/20 rounded-xl font-black text-[13px] transition-all"
 >
                                    Gerar Chave
                                </button>
                            </div>
                            <span className="text-[11px] font-medium text-muted-foreground block ml-2">
                                Um token arbitrário seguro. Deve ser idêntico ao configurado no painel da Alice.
                            </span>
                        </div>

                        {/* URL de Sincronização do Catálogo */}
                        <div className="md:col-span-2 space-y-3">
                            <label className="block text-[13px] font-medium text-muted-foreground ml-2">
                                URL de Sincronização da Alice (Nexus ➔ Alice)
                            </label>
                            <PremiumInput
                                name="alice_sync_url"
                                value={syncUrl}
                                onChange={(e) => setSyncUrl(e.target.value)}
                                placeholder="https://aliceinteligence.com/api/integrations/nexus/sync"
                                icon={<RefreshCw className="w-4 h-4 text-violet-500" />}
                            />
                            <span className="text-[11px] font-medium text-muted-foreground block ml-2">
                                Endereço de webhook fornecido pela Alice AI para onde enviaremos o catálogo de serviços ativos.
                            </span>
                        </div>
                    </div>

                    {/* Informative Alert box */}
                    <div className="flex gap-4 p-5 rounded-2xl bg-muted/20 border border-white/5 text-xs text-muted-foreground leading-relaxed">
                        <Info className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-foreground mb-1">Mapeamento de Prazos de Entrega</p>
                            No nicho de Assistência Técnica, o campo <code>stock</code> (estoque) das especialidades é sincronizado como o prazo estimado de reparo em dias úteis. Caso possua prazos definidos individualmente nos campos customizados dos serviços, a sincronização enviará estes valores automaticamente para a IA da Alice.
                        </div>
                    </div>

                    {/* Actions and Save button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-border">
                        <button
                            type="button"
                            onClick={handleSyncCatalog}
                            disabled={isSyncing || !active}
                            className="flex items-center justify-center gap-2 px-8 h-14 rounded-2xl bg-violet-500/10 text-violet-500 font-bold border border-violet-500/20 hover:bg-violet-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isSyncing ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Sincronizando Catálogo...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-5 h-5" />
                                    Sincronizar Catálogo Agora
                                </>
                            )}
                        </button>

                        <button
                            type="submit"
                            disabled={isPending || isSyncing}
                            className="flex items-center justify-center gap-2 px-10 h-14 rounded-2xl bg-violet-500 text-white font-bold hover:bg-violet-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-violet-500/20 transition-all"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Salvar Alterações
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
