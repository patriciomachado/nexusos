'use client'

import Sheet from '@/components/tasks/Sheet'
import { SwitchRow } from '@/components/ui/form'
import { QUICK_ACTIONS } from '@/lib/dashboard/quickActions'

/** Escolher quais atalhos aparecem no dashboard. Fica salvo neste aparelho. */
export default function EditQuickActions({ open, selected, onClose, onSave }: { open: boolean; selected: string[]; onClose: () => void; onSave: (ids: string[]) => void }) {
    const toggle = (id: string, checked: boolean) => {
        if (!checked && selected.length <= 1) return // mantém pelo menos um atalho
        onSave(checked ? [...selected, id] : selected.filter(x => x !== id))
    }
    return (
        <Sheet open={open} onClose={onClose} title="Atalhos do dashboard">
            <div className="space-y-2">
                <p className="px-4 text-[13px] text-muted-foreground">Escolha o que aparece nos atalhos rápidos. Fica salvo neste aparelho.</p>
                <div className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60 overflow-hidden">
                    {QUICK_ACTIONS.map(a => (
                        <SwitchRow key={a.id} label={a.label} checked={selected.includes(a.id)} onChange={v => toggle(a.id, v)} />
                    ))}
                </div>
            </div>
        </Sheet>
    )
}
