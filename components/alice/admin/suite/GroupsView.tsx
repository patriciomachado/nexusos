'use client'

import { useState } from 'react'
import { RefreshCw, Send, UsersRound } from 'lucide-react'
import { toast } from 'sonner'
import { api, Button, dateTime, Empty, Notice, Panel, Spinner, StatusPill, useLoad } from './ui'
import { SendSheet } from './ContactsView'

interface Group { id: string; jid: string; subject: string; description: string | null; participants: number; synced_at: string }

/** Grupos em que o número da loja está: enviar mensagem, e usar nos agendamentos e respostas de grupo. */
export default function GroupsView() {
    const { data, error, reload } = useLoad<{ groups: Group[] }>('/api/alice/groups')
    const [syncing, setSyncing] = useState(false)
    const [target, setTarget] = useState<Group | null>(null)

    const sync = async () => {
        setSyncing(true)
        try {
            const r = await api<{ synced: number }>('/api/alice/groups', { method: 'POST' })
            toast.success(`${r.synced} grupos encontrados`)
            reload()
        } catch (err) {
            toast.error((err as Error).message)
        } finally {
            setSyncing(false)
        }
    }

    return (
        <div className="space-y-4">
            <Notice>A Alice (IA) <b>nunca</b> responde em grupos. Só as <b>respostas automáticas</b> marcadas para “Grupos” (aba Respostas) funcionam lá.</Notice>
            <Panel title="Grupos" description="Os grupos do WhatsApp da loja." action={<Button variant="soft" busy={syncing} onClick={sync}><RefreshCw className="w-4 h-4" /> Atualizar</Button>}>
                {error ? <p className="px-5 pb-5 text-[14px] text-red-600">{error}</p> : !data ? <Spinner /> : data.groups.length === 0 ? (
                    <Empty icon={<UsersRound className="w-5 h-5" />}>Nenhum grupo carregado. Toque em Atualizar com o WhatsApp conectado.</Empty>
                ) : (
                    <ul className="divide-y divide-border/60 border-t border-border/60">
                        {data.groups.map(g => (
                            <li key={g.id} className="px-5 py-3 flex items-center gap-3">
                                <span className="w-10 h-10 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0"><UsersRound className="w-5 h-5" /></span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[15px] font-semibold truncate">{g.subject}</p>
                                    <div className="flex gap-1.5 pt-0.5"><StatusPill tone="gray">{g.participants} participantes</StatusPill><StatusPill tone="gray">Atualizado {dateTime(g.synced_at)}</StatusPill></div>
                                </div>
                                <button type="button" onClick={() => setTarget(g)} aria-label={`Enviar mensagem ao grupo ${g.subject}`} className="w-9 h-9 rounded-full flex items-center justify-center text-primary hover:bg-primary/10"><Send className="w-4 h-4" /></button>
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>
            {target && <SendSheet to={target.jid} label={target.subject} onClose={() => setTarget(null)} />}
        </div>
    )
}
