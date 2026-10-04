import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import { BackToSettings } from '@/components/settings/SettingsList'
import MessagesSettings from '@/components/settings/MessagesSettings'
import { getContext } from '@/lib/security'
import { isManager } from '@/lib/cash/server'

/** Mensagens que o app manda pro cliente no WhatsApp, de todos os módulos: texto e envio automático. */
export default async function MessagesSettingsPage() {
    const ctx = await getContext()
    if (!ctx) redirect('/entrar')
    if (!isManager(ctx.role)) redirect('/settings')
    return (
        <div className="min-h-full bg-background">
            <Header title="Mensagens automáticas" />
            <div className="max-w-2xl mx-auto px-4 pt-3 pb-16 space-y-4">
                <BackToSettings />
                <p className="px-1 text-[15px] text-muted-foreground">O que o app manda pro cliente pelo WhatsApp da loja. Ligue o envio automático onde quiser que saia sozinho e ajuste o texto de cada mensagem — os botões de enviar das telas usam o mesmo texto.</p>
                <MessagesSettings />
            </div>
        </div>
    )
}
