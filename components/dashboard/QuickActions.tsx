'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { openQuickAdd } from '@/components/tasks/QuickAddDialog'
import QuickQuoteSheet from './QuickQuoteSheet'
import EditQuickActions from './EditQuickActions'
import { DEFAULT_QUICK_ACTIONS, QUICK_ACTIONS } from '@/lib/dashboard/quickActions'

const KEY = 'nexus_quick_actions'
const tile = 'flex flex-col items-center gap-1.5 min-w-0'

/** Atalhos do dashboard, configuráveis por quem usa (Editar), lembrados neste aparelho. */
export default function QuickActions() {
    const [quoting, setQuoting] = useState(false)
    const [editing, setEditing] = useState(false)
    const [selected, setSelected] = useState<string[]>(DEFAULT_QUICK_ACTIONS)

    useEffect(() => {
        try {
            const raw = localStorage.getItem(KEY)
            const ids = raw ? (JSON.parse(raw) as string[]) : null
            if (ids?.length) {
                const valid = ids.filter(id => QUICK_ACTIONS.some(a => a.id === id))
                // eslint-disable-next-line react-hooks/set-state-in-effect
                if (valid.length) setSelected(valid)
            }
        } catch { /* private mode */ }
    }, [])

    const save = (ids: string[]) => {
        setSelected(ids)
        try { localStorage.setItem(KEY, JSON.stringify(ids)) } catch { /* ignore */ }
    }

    const actions = QUICK_ACTIONS.filter(a => selected.includes(a.id))

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
                <span className="text-[13px] font-medium text-muted-foreground">Atalhos</span>
                <button type="button" onClick={() => setEditing(true)} className="text-[13px] text-primary">Editar</button>
            </div>
            <nav aria-label="Atalhos" className="grid grid-cols-4 gap-2">
                {actions.map(a => {
                    const Icon = a.icon
                    const content = <><span className={a.circleClass}><Icon className="w-6 h-6" /></span><span className="text-[13px] font-medium truncate">{a.label}</span></>
                    if (a.kind === 'link') return <Link key={a.id} href={a.href!} className={tile}>{content}</Link>
                    if (a.kind === 'quote') return <button key={a.id} type="button" onClick={() => setQuoting(true)} className={tile}>{content}</button>
                    return <button key={a.id} type="button" onClick={openQuickAdd} className={tile}>{content}</button>
                })}
            </nav>
            <QuickQuoteSheet open={quoting} onClose={() => setQuoting(false)} />
            <EditQuickActions open={editing} selected={selected} onClose={() => setEditing(false)} onSave={save} />
        </div>
    )
}
