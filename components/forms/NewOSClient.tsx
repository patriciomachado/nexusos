'use client'

import { useState, useEffect } from 'react'
import NewOSForm from '@/components/forms/NewOSForm'
import QuickOSForm from '@/components/forms/QuickOSForm'
import OSModeToggle from '@/components/forms/OSModeToggle'

const MODE_KEY = 'nexus_os_mode'

interface Props {
    customers: { id: string; name: string }[]
    technicians: { id: string; name: string }[]
    inventoryItems: any[]
    companyId: string
    warrantyTerms?: string
}

export default function NewOSClient({ customers, technicians, inventoryItems, companyId, warrantyTerms }: Props) {
    const [mode, setMode] = useState<'quick' | 'guided'>('quick')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        const saved = localStorage.getItem(MODE_KEY) as 'quick' | 'guided' | null
        if (saved === 'quick' || saved === 'guided') setMode(saved)
        setMounted(true)
    }, [])

    function handleModeChange(newMode: 'quick' | 'guided') {
        setMode(newMode)
        localStorage.setItem(MODE_KEY, newMode)
    }

    if (!mounted) return null

    return (
        <div>
            <OSModeToggle mode={mode} onChange={handleModeChange} />

            {mode === 'quick' ? (
                // ⚡ Modo Rápido: formulário mínimo (cliente, tipo, modelo, problema)
                <QuickOSForm
                    customers={customers}
                    technicians={technicians}
                    companyId={companyId}
                />
            ) : (
                // 🧭 Modo Guiado: wizard completo de 6 etapas
                <NewOSForm
                    customers={customers}
                    technicians={technicians}
                    companyId={companyId}
                    inventoryItems={inventoryItems}
                    warrantyTerms={warrantyTerms}
                    mode="guided"
                />
            )}
        </div>
    )
}

