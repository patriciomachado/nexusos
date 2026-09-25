'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { BottomBar, PrimaryButton, SecondaryButton } from '@/components/ui/form'
import { BudgetSection, ClientSection, DeliverySection, DeviceSection, LockSection, ProblemSection } from './sections'
import { saveOS, useOSForm, type InventoryOption, type Option } from './state'

function Heading({ children }: { children: React.ReactNode }) {
    return <h2 className="text-[22px] font-semibold tracking-tight px-1 pt-2">{children}</h2>
}

/** Edit an order: the same sections as the wizard, all on one page. */
export default function OSEditForm({ order, customers: initialCustomers, technicians, inventory, companyId }: {
    order: Record<string, unknown> & { id: string }
    customers: Option[]
    technicians: Option[]
    inventory: InventoryOption[]
    companyId: string
}) {
    const router = useRouter()
    const state = useOSForm(order)
    const [customers, setCustomers] = useState(initialCustomers)
    const [saving, setSaving] = useState(false)
    const v = state.values

    const save = async () => {
        if (!v.customer_id) return toast.error('Escolha o cliente')
        if (!v.title.trim()) return toast.error('Informe o tipo de aparelho')
        setSaving(true)
        try {
            await saveOS(state, companyId, order.id)
            toast.success('OS atualizada')
            router.push(`/service-orders/${order.id}`)
            router.refresh()
        } catch (err) {
            toast.error((err as Error).message)
            setSaving(false)
        }
    }

    return (
        <div className="pt-4 flex-1 flex flex-col">
            <div className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 space-y-6">
                <Heading>Cliente</Heading>
                <ClientSection state={state} customers={customers} onCustomersChange={setCustomers} technicians={technicians} companyId={companyId} showStatus={false} invalid={!v.customer_id} />
                <Heading>Aparelho</Heading>
                <DeviceSection state={state} invalid={!v.title.trim()} />
                <Heading>Problema e estado</Heading>
                <ProblemSection state={state} />
                <Heading>Senha do aparelho</Heading>
                <LockSection state={state} />
                <Heading>Orçamento e entrega</Heading>
                <BudgetSection state={state} inventory={inventory} />
                <DeliverySection state={state} />
            </div>
            <BottomBar>
                <SecondaryButton onClick={() => router.back()} disabled={saving}>Cancelar</SecondaryButton>
                <PrimaryButton onClick={save} disabled={saving} className="flex-1">
                    {saving && <Loader2 className="w-5 h-5 animate-spin" />} Salvar alterações
                </PrimaryButton>
            </BottomBar>
        </div>
    )
}
