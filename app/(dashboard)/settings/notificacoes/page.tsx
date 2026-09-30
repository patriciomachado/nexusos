import Header from '@/components/layout/Header'
import { BackToSettings } from '@/components/settings/SettingsList'
import { Group } from '@/components/ui/form'
import PushToggle from '@/components/tasks/PushToggle'

/** Notifications on this device, and what the iPhone needs for them and for the camera and microphone. */
export default function NotificationsSettingsPage() {
    return (
        <div className="min-h-full bg-background">
            <Header title="Notificações" />
            <div className="max-w-2xl mx-auto px-4 pt-3 pb-16 space-y-5">
                <BackToSettings />

                <Group title="Este aparelho" footer="Cada celular ou computador é ativado separadamente. Depois de ativar, dá para mandar uma notificação de teste.">
                    <div className="flex items-center gap-3 px-4 py-3">
                        <span className="flex-1 min-w-0">
                            <span className="block text-[17px]">Lembretes no celular</span>
                            <span className="block text-[13px] text-muted-foreground">Tarefas e rotinas na hora marcada, mesmo com o app fechado.</span>
                        </span>
                        <PushToggle />
                    </div>
                </Group>

                <Group title="No iPhone">
                    <ol className="px-4 py-3 space-y-2 text-[15px] text-muted-foreground list-decimal pl-9">
                        <li>O iPhone precisa estar no <strong className="text-foreground">iOS 16.4 ou mais novo</strong>.</li>
                        <li>Abra o Nexus <strong className="text-foreground">pelo ícone na Tela de Início</strong>, não pelo Safari.</li>
                        <li>Toque em <strong className="text-foreground">Lembretes no celular</strong> acima e em <strong className="text-foreground">Permitir</strong>.</li>
                        <li>Se não chegar nada, veja <strong className="text-foreground">Ajustes → Notificações → Nexus OS</strong> e confira se está permitido.</li>
                    </ol>
                </Group>

                <Group title="Câmera e microfone" footer="O iPhone não guarda essa permissão para apps da Tela de Início; com a opção “Permitir” nos Ajustes do Safari, ele para de perguntar a cada leitura ou áudio.">
                    <ol className="px-4 py-3 space-y-2 text-[15px] text-muted-foreground list-decimal pl-9">
                        <li>Abra <strong className="text-foreground">Ajustes → Apps → Safari</strong> (em iOS mais antigo, <strong className="text-foreground">Ajustes → Safari</strong>).</li>
                        <li>Em <strong className="text-foreground">Ajustes dos Sites</strong>, toque em <strong className="text-foreground">Câmera</strong> e escolha <strong className="text-foreground">Permitir</strong>.</li>
                        <li>Faça o mesmo em <strong className="text-foreground">Microfone</strong> para os áudios da Alice.</li>
                    </ol>
                </Group>
            </div>
        </div>
    )
}
