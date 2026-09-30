'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Edit } from 'lucide-react'
import { toast } from 'sonner'
import PremiumConfirmDialog from '@/components/ui/PremiumConfirmDialog'
import ActionMenu from '@/components/ui/ActionMenu'

interface CustomerActionsProps {
    customerId: string
    customerName: string
    className?: string
}

export default function CustomerActions({ 
    customerId, 
    customerName, 
    className
}: CustomerActionsProps) {
    const router = useRouter()
    const [, startTransition] = useTransition()
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    async function handleDelete() {
        startTransition(async () => {
            try {
                const res = await fetch(`/api/customers/${customerId}`, {
                    method: 'DELETE',
                })

                if (res.ok) {
                    toast.success('Cliente removido')
                    // Redirect to customers list after deletion
                    router.push('/customers')
                    router.refresh()
                } else {
                    const error = await res.json()
                    toast.error(error.error || 'Não foi possível remover o cliente. Tente de novo.')
                }
            } catch {
                toast.error('Sem conexão. Tente de novo.')
            } finally {
                setShowDeleteConfirm(false)
            }
        })
    }

    return (
        <div className={className}>
            <ActionMenu
                label="Ações do cliente"
                items={[
                    { label: 'Editar', icon: <Edit className="w-4 h-4" />, onSelect: () => router.push(`/customers/${customerId}/edit`) },
                    'separator',
                    { label: 'Excluir', icon: <Trash2 className="w-4 h-4" />, onSelect: () => setShowDeleteConfirm(true), danger: true },
                ]}
            />

            <PremiumConfirmDialog
                isOpen={showDeleteConfirm}
                title="Excluir cliente?"
                description={`“${customerName}” sai da lista. As OS e vendas dele continuam no histórico.`}
                confirmLabel="Excluir"
                cancelLabel="Manter"
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </div>
    )
}
