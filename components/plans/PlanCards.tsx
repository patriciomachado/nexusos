'use client'

import Link from 'next/link'
import { Check, Loader2, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FEATURE_INFO, PLAN_ROWS, PLANS, type PlanId } from '@/lib/plans'

const ORDER: PlanId[] = ['essencial', 'pro']

const HIGHLIGHTS: Record<PlanId, string[]> = {
    essencial: [
        'Ordens de serviço com acompanhamento pelo cliente',
        'PDV, caixa e contas fixas',
        'Estoque, peças e aparelhos',
        'Clientes, agenda e tarefas',
        'Faturamento e indicadores do mês',
        'Até 2 usuários',
    ],
    pro: [
        'Tudo do Essencial',
        `${FEATURE_INFO.alice.title}: até ${PLANS.pro.aliceReplies.toLocaleString('pt-BR')} respostas/mês`,
        'Relatórios completos: DRE, metas e técnicos',
        'Pós-venda com contato pelo WhatsApp',
        'Catálogo online e Studio de conteúdo',
        'Usuários sem limite',
    ],
}

type Action =
    | { kind: 'link'; href: (plan: PlanId) => string; label?: (plan: PlanId) => string }
    | { kind: 'button'; onChoose: (plan: PlanId) => void; busy?: PlanId | null; label?: (plan: PlanId) => string; disabled?: (plan: PlanId) => boolean }

/** The two plans side by side (subscription page and landing). */
export function PlanCards({ action, current, className }: { action: Action; current?: PlanId | null; className?: string }) {
    return (
        <div className={cn('grid md:grid-cols-2 gap-4', className)}>
            {ORDER.map(id => {
                const plan = PLANS[id]
                const pro = id === 'pro'
                const label = action.label?.(id) ?? `Assinar o ${plan.name}`
                const cta = cn(
                    'mt-6 h-11 w-full rounded-full text-[15px] font-semibold inline-flex items-center justify-center gap-2 transition-opacity disabled:opacity-50',
                    pro ? 'bg-primary text-primary-foreground' : 'bg-foreground/[0.07] text-foreground'
                )
                return (
                    <article key={id} className={cn('rounded-3xl bg-card border p-6 sm:p-7 flex flex-col', pro ? 'border-primary/50 shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.35)]' : 'border-border/60')}>
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="text-[20px] font-semibold tracking-tight">{plan.name}</h3>
                            {current === id ? (
                                <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">Seu plano</span>
                            ) : pro ? (
                                <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">Mais completo</span>
                            ) : null}
                        </div>
                        <p className="text-[14px] text-muted-foreground mt-1">{plan.tagline}</p>
                        <p className="mt-5 flex items-baseline gap-1">
                            <span className="text-[15px] font-medium text-muted-foreground">R$</span>
                            <span className="text-[44px] leading-none font-semibold tracking-tight tabular-nums">{plan.price}</span>
                            <span className="text-[15px] text-muted-foreground">/mês</span>
                        </p>
                        <ul className="mt-6 space-y-2.5 text-[15px] flex-1">
                            {HIGHLIGHTS[id].map(h => (
                                <li key={h} className="flex gap-2.5">
                                    <Check className={cn('w-[18px] h-[18px] mt-0.5 shrink-0', pro ? 'text-primary' : 'text-emerald-600 dark:text-emerald-400')} />
                                    <span>{h}</span>
                                </li>
                            ))}
                        </ul>
                        {action.kind === 'link' ? (
                            <Link href={action.href(id)} className={cta}>{label}</Link>
                        ) : (
                            <button type="button" onClick={() => action.onChoose(id)} disabled={!!action.busy || action.disabled?.(id)} className={cta}>
                                {action.busy === id && <Loader2 className="w-4 h-4 animate-spin" />}
                                {label}
                            </button>
                        )}
                    </article>
                )
            })}
        </div>
    )
}

/** Line-by-line comparison of the two plans. */
export function PlanTable({ className }: { className?: string }) {
    const cell = (v: boolean | string) =>
        v === true ? <Check className="w-[18px] h-[18px] text-primary inline" aria-label="Incluído" />
            : v === false ? <Minus className="w-[18px] h-[18px] text-muted-foreground/50 inline" aria-label="Não incluído" />
                : <span className="text-[13px] sm:text-[14px]">{v}</span>
    return (
        <div className={cn('rounded-3xl bg-card border border-border/60 overflow-hidden', className)}>
            <table className="w-full text-[14px] sm:text-[15px]">
                <thead>
                    <tr className="text-left">
                        <th className="font-medium text-muted-foreground px-4 sm:px-6 py-3.5">Recurso</th>
                        <th className="font-semibold text-center px-2 sm:px-4 py-3.5 w-[27%]">Essencial</th>
                        <th className="font-semibold text-center px-2 sm:px-4 py-3.5 w-[27%] text-primary">Pro</th>
                    </tr>
                </thead>
                <tbody>
                    {PLAN_ROWS.map(r => (
                        <tr key={r.label} className="border-t border-border/50">
                            <td className="px-4 sm:px-6 py-3">{r.label}</td>
                            <td className="text-center px-2 sm:px-4 py-3 text-muted-foreground">{cell(r.essencial)}</td>
                            <td className="text-center px-2 sm:px-4 py-3">{cell(r.pro)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
