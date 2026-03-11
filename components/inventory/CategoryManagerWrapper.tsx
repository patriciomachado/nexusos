'use client'

import { useState } from 'react'
import { Tag } from 'lucide-react'
import CategoryManager from './CategoryManager'
import PremiumConfirmDialog from '@/components/ui/PremiumConfirmDialog'

export default function CategoryManagerWrapper() {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="h-14 flex items-center gap-3 px-8 rounded-[1.5rem] bg-muted/30 border border-white/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 hover:text-foreground transition-all"
            >
                <Tag className="w-5 h-5" />
                <span>Categorias</span>
            </button>

            {isOpen && <CategoryManager onClose={() => setIsOpen(false)} />}
        </>
    )
}
