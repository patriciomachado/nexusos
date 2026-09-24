'use client'

import { useEffect, useState } from 'react'
import { Loader2, MessageCircle, Smartphone } from 'lucide-react'
import Segmented from '@/components/ui/Segmented'
import { cn } from '@/lib/utils'

interface Entry {
    id: string
    tool: string
    kind: 'read' | 'write'
    status: string
    summary: string | null
    error: string | null
    channel: 'app' | 'whatsapp'
    created_at: string
    user: string | null
}

const TOOL_NAMES: Record<string, string> = {
    buscar_clientes: 'Buscou clientes',
    ver_cliente: 'Abriu ficha de cliente',
    cadastrar_cliente: 'Cadastrar cliente',
    atualizar_cliente: 'Atualizar cliente',
    buscar_ordens: 'Buscou ordens de serviço',
    ver_ordem: 'Abriu uma OS',
    criar_ordem: 'Abrir OS',
    atualizar_status_ordem: 'Mudar status de OS',
    adicionar_nota_ordem: 'Anotar em OS',
    atribuir_tecnico: 'Atribuir técnico',
    ver_agenda: 'Consultou a agenda',
    agendar_atendimento: 'Agendar atendimento',
    listar_tecnicos: 'Consultou técnicos',
    consultar_estoque: 'Consultou estoque',
    consultar_aparelhos: 'Consultou aparelhos',
    listar_servicos: 'Consultou serviços',
    ver_pendencias: 'Consultou pendências',
    resumo_financeiro: 'Consultou o financeiro',
    ver_tarefas: 'Consultou tarefas',
    criar_tarefa: 'Criar tarefa',
    minhas_ordens: 'Cliente consultou os serviços',
    informacoes_da_loja: 'Cliente pediu informações',
    aparelhos_a_venda: 'Cliente viu aparelhos à venda',
    chamar_atendente: 'Cliente pediu atendente',
    registrar_pedido: 'Cliente fez um pedido',
}

const STATUS: Record<string, { label: string; cls: string }> = {
    read: { label: 'Consulta', cls: 'bg-foreground/[0.06] text-muted-foreground' },
    proposed: { label: 'Aguardando', cls: 'bg-blue-500/12 text-blue-700 dark:text-blue-400' },
    executed: { label: 'Executada', cls: 'bg-green-500/12 text-green-700 dark:text-green-400' },
    rejected: { label: 'Cancelada', cls: 'bg-foreground/[0.06] text-muted-foreground' },
    expired: { label: 'Expirou', cls: 'bg-foreground/[0.06] text-muted-foreground' },
    failed: { label: 'Falhou', cls: 'bg-red-500/12 text-red-700 dark:text-red-400' },
    denied: { label: 'Bloqueada', cls: 'bg-red-500/12 text-red-700 dark:text-red-400' },
}

export default function ActivityView() {
    const [filter, setFilter] = useState<'write' | 'all'>('write')
    const [entries, setEntries] = useState<Entry[] | null>(null)

    useEffect(() => {
        let cancelled = false
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setEntries(null)
        fetch(`/api/alice/activity${filter === 'write' ? '?kind=write' : ''}`, { cache: 'no-store' })
            .then(r => r.json())
            .then(d => { if (!cancelled) setEntries(d.activity ?? []) })
            .catch(() => { if (!cancelled) setEntries([]) })
        return () => { cancelled = true }
    }, [filter])

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-[14px] text-muted-foreground">Tudo o que a Alice consultou ou fez, e quem pediu.</p>
                <Segmented size="sm" value={filter} onChange={setFilter} options={[{ value: 'write', label: 'Ações' }, { value: 'all', label: 'Tudo' }]} ariaLabel="Filtrar atividade" />
            </div>
            <div className="rounded-2xl bg-card border border-border/60 overflow-hidden">
                {entries === null ? (
                    <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                ) : entries.length === 0 ? (
                    <p className="p-8 text-center text-[15px] text-muted-foreground">Nada registrado ainda.</p>
                ) : (
                    <ul className="divide-y divide-border/60">
                        {entries.map(e => {
                            const st = STATUS[e.status] ?? STATUS.read
                            const [title, ...lines] = (e.summary ?? '').split('\n')
                            return (
                                <li key={e.id} className="px-4 py-3 flex gap-3">
                                    <span className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', e.channel === 'whatsapp' ? 'bg-green-500/15 text-green-700 dark:text-green-400' : 'bg-primary/12 text-primary')}>
                                        {e.channel === 'whatsapp' ? <MessageCircle className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-[15px] font-medium">{TOOL_NAMES[e.tool] ?? e.tool}</p>
                                            <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', st.cls)}>{st.label}</span>
                                        </div>
                                        {e.summary && <p className="text-[13px] text-muted-foreground break-words">{[title, ...lines].filter(Boolean).join(' · ')}</p>}
                                        {e.error && <p className="text-[13px] text-red-600 dark:text-red-400">{e.error}</p>}
                                        <p className="text-[12px] text-muted-foreground mt-0.5">
                                            {e.channel === 'whatsapp' ? 'WhatsApp' : e.user ?? 'App'} · {new Date(e.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>
        </div>
    )
}
