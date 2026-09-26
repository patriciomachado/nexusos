'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { toggleableModules } from '@/components/layout/nav-config'
import { cn } from '@/lib/utils'

/** What each module is for, so the owner knows what turning it off hides. */
const ABOUT: Record<string, string> = {
    '/tarefas': 'Lista de tarefas e lembretes do dono',
    '/appointments': 'Quadro das OS por etapa',
    '/agenda': 'Horários marcados com clientes',
    '/service-orders': 'Ordens de serviço',
    '/pdv': 'Venda de produtos no balcão',
    '/devices': 'Compra e venda de aparelhos',
    '/customers': 'Cadastro e histórico de clientes',
    '/pecas': 'Peças usadas nas OS',
    '/inventory': 'Estoque de produtos',
    '/post-sales': 'Contato depois da entrega',
    '/alice': 'Assistente de IA e WhatsApp',
    '/cash-register': 'Abertura e fechamento do caixa',
    '/contas': 'Contas a pagar e receber',
    '/team': 'Equipe, comissões e ponto',
    '/reports': 'Relatórios de vendas e serviços',
}

/**
 * Turn whole modules on or off for the store. An off module leaves the menu
 * for everyone and its pages show a notice; its data stays saved.
 */
export default function ModulesClient({ initialOff }: { initialOff: string[] }) {
    const router = useRouter()
    const [off, setOff] = useState(initialOff)
    const [saving, setSaving] = useState<string | null>(null)
    const groups = toggleableModules()

    const toggle = async (href: string, on: boolean) => {
        const prev = off
        const next = on ? off.filter(h => h !== href) : [...off, href]
        setOff(next)
        setSaving(href)
        try {
            const res = await fetch('/api/settings/modules', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ off: next }) })
            if (!res.ok) throw new Error()
            router.refresh()
        } catch {
            setOff(prev)
            toast.error('Não foi possível salvar. Tente de novo.')
        } finally {
            setSaving(null)
        }
    }

    return (
        <div className="space-y-6">
            <p className="px-1 text-[15px] text-muted-foreground text-pretty">
                Desligue o que a loja não usa. O módulo sai do menu de todo mundo, inclusive do seu, e os dados dele continuam guardados.
            </p>
            {groups.map(g => (
                <section key={g.title} className="space-y-1.5">
                    <h3 className="px-4 text-[13px] font-medium text-muted-foreground">{g.title}</h3>
                    <div className="rounded-2xl bg-card border border-border/60 overflow-hidden divide-y divide-border/60">
                        {g.items.map(item => {
                            const Icon = item.icon
                            const on = !off.includes(item.href)
                            return (
                                <label key={item.href} className="flex items-center gap-3 pl-3 pr-4 min-h-[56px] py-2 cursor-pointer">
                                    <span className={cn('w-[30px] h-[30px] rounded-[8px] flex items-center justify-center text-white shrink-0 transition-opacity', item.tint, !on && 'opacity-40')}>
                                        <Icon aria-hidden className="w-[18px] h-[18px]" strokeWidth={2.2} />
                                    </span>
                                    <span className="flex-1 min-w-0">
                                        <span className={cn('block text-[17px] truncate', !on && 'text-muted-foreground')}>{item.label}</span>
                                        <span className="block text-[13px] text-muted-foreground truncate">{saving === item.href ? 'Salvando…' : ABOUT[item.href] ?? ''}</span>
                                    </span>
                                    <input type="checkbox" className="sr-only peer" checked={on} disabled={saving !== null} onChange={e => toggle(item.href, e.target.checked)} aria-label={`${item.label}: ${on ? 'ligado' : 'desligado'}`} />
                                    <span aria-hidden className="relative w-[51px] h-[31px] shrink-0 rounded-full bg-foreground/[0.12] peer-checked:bg-emerald-500 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 peer-disabled:opacity-60 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-[27px] after:h-[27px] after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-[20px]" />
                                </label>
                            )
                        })}
                    </div>
                </section>
            ))}
            <p className="px-4 text-[13px] text-muted-foreground">Dashboard e Configurações ficam sempre ligados. Para esconder um módulo só de algumas funções, use Equipe → Permissões.</p>
        </div>
    )
}
