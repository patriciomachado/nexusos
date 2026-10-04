'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Segmented from '@/components/ui/Segmented'
import AliceSettingsView, { type SettingsPayload } from './AliceSettingsView'
import WhatsAppInbox from './WhatsAppInbox'
import ActivityView from './ActivityView'
import AutoRepliesView from './suite/AutoRepliesView'
import SchedulerView from './suite/SchedulerView'
import BroadcastView from './suite/BroadcastView'
import ContactsView from './suite/ContactsView'
import GroupsView from './suite/GroupsView'
import LabelsView from './suite/LabelsView'
import WebhooksView from './suite/WebhooksView'
import StickerView from './suite/StickerView'
import { Loader2, Database } from 'lucide-react'

type Tab = 'conversas' | 'respostas' | 'agendador' | 'disparos' | 'contatos' | 'grupos' | 'etiquetas' | 'webhooks' | 'figurinhas' | 'config' | 'atividade'
const TABS: Tab[] = ['conversas', 'respostas', 'agendador', 'disparos', 'contatos', 'grupos', 'etiquetas', 'webhooks', 'figurinhas', 'config', 'atividade']
/** What a staff role without admin access gets: just enough for the messages inbox. */
type StaffPayload = { isAdmin: false; settings: { whatsapp_enabled: boolean; instagram_enabled: boolean } }
type Payload = SettingsPayload | StaffPayload

export default function AliceAdmin() {
    const params = useSearchParams()
    const router = useRouter()
    const [data, setData] = useState<Payload | null>(null)
    const [error, setError] = useState<{ message: string; migration: boolean } | null>(null)
    const [tab, setTab] = useState<Tab>(params.get('conversa') ? 'conversas' : TABS.includes(params.get('aba') as Tab) ? (params.get('aba') as Tab) : 'conversas')
    const [unread, setUnread] = useState(0)

    const load = useCallback(async () => {
        const res = await fetch('/api/alice/settings', { cache: 'no-store' })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) {
            setError({ message: body.error ?? 'Não foi possível carregar.', migration: body.code === 'MIGRATION_MISSING' })
            return
        }
        setError(null)
        setData(body)
    }, [])

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load()
    }, [load])

    // A WhatsApp button elsewhere in the app deep-links here without remounting this page (same route, just the query
    // string changes) — so the tab has to react to it, not just read it once at mount.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (params.get('conversa')) setTab('conversas')
    }, [params])

    const changeTab = (next: Tab) => {
        setTab(next)
        const url = new URL(window.location.href)
        url.searchParams.set('aba', next)
        if (next !== 'conversas') url.searchParams.delete('conversa')
        router.replace(url.pathname + url.search, { scroll: false })
    }

    if (error) {
        return (
            <div className="px-4 sm:px-6 lg:px-8 pt-8 max-w-2xl mx-auto">
                <div className="rounded-2xl bg-card border border-border/60 p-6 text-center space-y-3">
                    <span className="mx-auto w-12 h-12 rounded-full bg-orange-500/12 text-orange-600 dark:text-orange-400 flex items-center justify-center"><Database className="w-6 h-6" /></span>
                    <p className="type-headline">{error.migration ? 'Falta ativar a Alice no banco de dados' : 'Não foi possível carregar'}</p>
                    <p className="text-[15px] text-muted-foreground">
                        {error.migration ? 'No Supabase, abra o SQL Editor, cole o arquivo supabase/migrations/20260925_alice_agent.sql inteiro e clique em Run. Depois recarregue esta página.' : error.message}
                    </p>
                </div>
            </div>
        )
    }
    if (!data) return <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>

    // Staff allowed into Alice but not an admin: just the messages inbox, no config or activity log.
    if (!data.isAdmin) {
        return (
            <div className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-10 max-w-6xl mx-auto">
                <WhatsAppInbox enabled={data.settings.whatsapp_enabled || data.settings.instagram_enabled} initialId={params.get('conversa')} onUnread={setUnread} isAdmin={false} />
            </div>
        )
    }

    return (
        <div className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-10 max-w-6xl mx-auto space-y-5">
            <Segmented<Tab>
                value={tab}
                onChange={changeTab}
                ariaLabel="Seções da Alice"
                className="w-full"
                options={[
                    { value: 'conversas', label: 'Mensagens', badge: unread },
                    { value: 'respostas', label: 'Respostas' },
                    { value: 'agendador', label: 'Agendador' },
                    { value: 'disparos', label: 'Disparos' },
                    { value: 'contatos', label: 'Contatos' },
                    { value: 'grupos', label: 'Grupos' },
                    { value: 'etiquetas', label: 'Etiquetas' },
                    { value: 'webhooks', label: 'Webhooks' },
                    { value: 'figurinhas', label: 'Figurinhas' },
                    { value: 'config', label: 'Configuração' },
                    { value: 'atividade', label: 'Atividade' },
                ]}
            />
            {tab === 'config' && <AliceSettingsView data={data} onSaved={setData} onReload={load} />}
            {tab === 'conversas' && <WhatsAppInbox enabled={data.settings.whatsapp_enabled || data.settings.instagram_enabled} initialId={params.get('conversa')} onUnread={setUnread} onSetup={() => changeTab('config')} />}
            {tab === 'respostas' && <AutoRepliesView />}
            {tab === 'agendador' && <SchedulerView />}
            {tab === 'disparos' && <BroadcastView />}
            {tab === 'contatos' && <ContactsView />}
            {tab === 'grupos' && <GroupsView />}
            {tab === 'etiquetas' && <LabelsView />}
            {tab === 'webhooks' && <WebhooksView />}
            {tab === 'figurinhas' && <StickerView />}
            {tab === 'atividade' && <ActivityView />}
        </div>
    )
}
