'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import NewOSForm from '@/components/forms/NewOSForm'
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

    if (!mounted) return null // Avoid SSR mismatch

    return (
        <div>
            <OSModeToggle mode={mode} onChange={handleModeChange} />
            <NewOSForm
                customers={customers}
                technicians={technicians}
                companyId={companyId}
                inventoryItems={inventoryItems}
                warrantyTerms={warrantyTerms}
                mode={mode}
            />
        </div>
    )
}
