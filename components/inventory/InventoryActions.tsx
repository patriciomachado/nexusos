'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowDownRight, ArrowUpRight, Loader2, Pencil, Trash2 } from 'lucide-react'
import PremiumConfirmDialog from '@/components/ui/PremiumConfirmDialog'
import ActionMenu from '@/components/ui/ActionMenu'
import Sheet from '@/components/tasks/Sheet'
import Segmented from '@/components/ui/Segmented'
import { Field, Group, PrimaryButton, TextInput, parseMoney } from '@/components/ui/form'

export default function InventoryActions({ itemId }: { itemId: string; companyId?: string }) {
    const router = useRouter()
    const [adjusting, setAdjusting] = useState(false)
    const [adjustQty, setAdjustQty] = useState('')
    const [adjustType, setAdjustType] = useState<'add' | 'remove'>('add')
    const [isDeleting, setIsDeleting] = useState(false)
    const [isPending, startTransition] = useTransition()

    const openAdjust = (type: 'add' | 'remove') => { setAdjustType(type); setAdjustQty(''); setAdjusting(true) }

    function handleAdjust() {
        const qty = parseMoney(adjustQty)
        if (!qty) { toast.error('Informe uma quantidade maior que zero'); return }
        startTransition(async () => {
            const res = await fetch(`/api/inventory/${itemId}/adjust`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity: adjustType === 'add' ? qty : -qty }),
            })
            if (res.ok) {
                toast.success(adjustType === 'add' ? 'Entrada registrada' : 'Saída registrada')
                setAdjusting(false)
                router.refresh()
            } else {
                toast.error('Não foi possível ajustar o estoque. Tente de novo.')
            }
        })
    }

    function handleDelete() {
        setIsDeleting(false)
        startTransition(async () => {
            const res = await fetch(`/api/inventory/${itemId}`, { method: 'DELETE' })
            if (res.ok) {
                toast.success('Produto excluído')
                router.refresh()
            } else {
                toast.error('Não foi possível excluir o produto. Tente de novo.')
            }
        })
    }

    return (
        <>
            <ActionMenu
                label="Ações do produto"
                items={[
                    { label: 'Editar', icon: <Pencil className="w-4 h-4" />, onSelect: () => router.push(`/inventory/${itemId}/edit`) },
                    'separator',
                    { label: 'Entrada de estoque', icon: <ArrowUpRight className="w-4 h-4" />, onSelect: () => openAdjust('add') },
                    { label: 'Saída de estoque', icon: <ArrowDownRight className="w-4 h-4" />, onSelect: () => openAdjust('remove') },
                    'separator',
                    { label: 'Excluir', icon: <Trash2 className="w-4 h-4" />, onSelect: () => setIsDeleting(true), danger: true },
                ]}
            />

            <Sheet
                open={adjusting}
                onClose={() => setAdjusting(false)}
                title="Ajustar estoque"
                footer={
                    <PrimaryButton className="flex-1" onClick={handleAdjust} disabled={isPending || !adjustQty}>
                        {isPending && <Loader2 aria-hidden className="w-5 h-5 animate-spin" />}
                        {adjustType === 'add' ? 'Registrar entrada' : 'Registrar saída'}
                    </PrimaryButton>
                }
            >
                <div className="space-y-4">
                    <Segmented
                        className="w-full [&>button]:flex-1"
                        ariaLabel="Tipo de ajuste"
                        value={adjustType}
                        onChange={setAdjustType}
                        options={[{ value: 'add', label: 'Entrada' }, { value: 'remove', label: 'Saída' }]}
                    />
                    <Group>
                        <Field label="Quantidade" htmlFor="inv-adjust-qty">
                            <TextInput
                                id="inv-adjust-qty"
                                data-autofocus
                                inputMode="decimal"
                                enterKeyHint="done"
                                value={adjustQty}
                                onChange={e => setAdjustQty(e.target.value.replace(/[^\d.,]/g, ''))}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdjust() } }}
                                placeholder="0"
                                className="tabular-nums"
                            />
                        </Field>
                    </Group>
                </div>
            </Sheet>

            <PremiumConfirmDialog
                isOpen={isDeleting}
                title="Excluir produto?"
                description="O produto sai do estoque. Essa ação não pode ser desfeita."
                confirmLabel="Excluir"
                cancelLabel="Manter"
                onConfirm={handleDelete}
                onCancel={() => setIsDeleting(false)}
                variant="danger"
            />
        </>
    )
}
