'use client'

import { useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import { useAliceStore } from '@/store/aliceStore'

/** Header entry point. Hidden for people who can't use Alice. */
export default function AliceButton() {
    const status = useAliceStore(s => s.status)
    const fetchStatus = useAliceStore(s => s.fetchStatus)
    const setOpen = useAliceStore(s => s.setOpen)

    useEffect(() => {
        if (!status) fetchStatus()
    }, [status, fetchStatus])

    if (!status?.available) return null
    return (
        <button
            type="button"
            onClick={() => setOpen(true)}
            className="h-9 pl-2.5 pr-3 rounded-full flex items-center gap-1.5 bg-primary/12 text-primary text-[14px] font-semibold hover:bg-primary/18 active:scale-[0.97] transition-[background-color,transform]"
            aria-label="Falar com a Alice"
            title="Alice (⌘J)"
        >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Alice</span>
        </button>
    )
}
