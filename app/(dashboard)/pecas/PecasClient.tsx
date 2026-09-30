'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import { cn } from '@/lib/utils'
import { useData, type Supplier } from './shared'
import PainelTab from './PainelTab'
import EstoqueTab from './EstoqueTab'
import ComprarTab from './ComprarTab'
import PrecosTab from './PrecosTab'
import FornecedoresTab from './FornecedoresTab'
import DefeitosTab from './DefeitosTab'
import OrcamentosTab from './OrcamentosTab'

const TABS = [
    { value: 'painel', label: 'Painel' },
    { value: 'estoque', label: 'Estoque' },
    { value: 'comprar', label: 'Comprar' },
    { value: 'precos', label: 'Preços' },
    { value: 'orcamentos', label: 'Orçamentos' },
    { value: 'fornecedores', label: 'Fornecedores' },
    { value: 'defeitos', label: 'Defeitos' },
] as const
type Tab = typeof TABS[number]['value']

/**
 * Peças e componentes: parts stock taken out by service orders, what to buy
 * and from whom, supplier prices, defects and the repair price table.
 */
export default function PecasClient({ initialTab }: { initialTab?: string }) {
    const [tab, setTab] = useState<Tab>(TABS.some(t => t.value === initialTab) ? initialTab as Tab : 'painel')
    const { data: sup, reload: reloadSuppliers } = useData<{ suppliers: Supplier[] }>('/api/parts/suppliers')
    const suppliers = sup?.suppliers ?? []

    return (
        <div className="min-h-full bg-background">
            <Header title="Peças e componentes" />
            <div className="max-w-3xl mx-auto px-4 lg:px-8 pt-3 pb-16 space-y-4">
                <div role="tablist" aria-label="Seções" className="-mx-4 px-4 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {TABS.map(t => (
                        <button key={t.value} type="button" role="tab" aria-selected={tab === t.value} onClick={() => setTab(t.value)}
                            className={cn('h-9 px-3.5 rounded-full text-[15px] font-medium shrink-0 transition-colors', tab === t.value ? 'bg-primary text-primary-foreground' : 'bg-foreground/[0.06] hover:bg-foreground/[0.1]')}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {tab === 'painel' && <PainelTab onGo={setTab} />}
                {tab === 'estoque' && <EstoqueTab suppliers={suppliers} />}
                {tab === 'comprar' && <ComprarTab suppliers={suppliers} />}
                {tab === 'precos' && <PrecosTab />}
                {tab === 'orcamentos' && <OrcamentosTab />}
                {tab === 'fornecedores' && <FornecedoresTab suppliers={sup?.suppliers ?? null} onChanged={reloadSuppliers} />}
                {tab === 'defeitos' && <DefeitosTab suppliers={suppliers} />}
            </div>
        </div>
    )
}
