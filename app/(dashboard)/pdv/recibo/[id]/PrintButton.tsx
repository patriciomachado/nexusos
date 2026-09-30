'use client'

import { Printer } from 'lucide-react'

export default function PrintButton() {
    return (
        <button type="button" onClick={() => window.print()} className="h-9 px-3 rounded-full bg-foreground/[0.07] inline-flex items-center gap-1.5 text-[14px] font-medium">
            <Printer className="w-4 h-4" /> Imprimir / PDF
        </button>
    )
}
