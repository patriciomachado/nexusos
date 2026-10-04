'use client'

import { useState } from 'react'
import { Pencil, Plus, Tag, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Sheet from '@/components/tasks/Sheet'
import PremiumConfirmDialog from '@/components/ui/PremiumConfirmDialog'
import { api, Button, Empty, fieldCls, FieldRow, Notice, Panel, Spinner, useLoad } from './ui'

export interface Label { id: string; name: string; color: string }
const COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#f97316', '#eab308', '#ef4444', '#64748b']

/** Etiquetas para organizar as conversas (ex.: Orçamento, Retirada, Garantia). Aplicadas na caixa de mensagens. */
export default function LabelsView() {
    const { data, error, reload } = useLoad<{ labels: Label[] }>('/api/alice/labels')
    const [editing, setEditing] = useState<{ id: string | null; name: string; color: string } | null>(null)
    const [busy, setBusy] = useState(false)
    const [removing, setRemoving] = useState<Label | null>(null)

    const save = async () => {
        if (!editing) return
        setBusy(true)
        try {
            await api(editing.id ? `/api/alice/labels/${editing.id}` : '/api/alice/labels', { method: editing.id ? 'PUT' : 'POST', body: { name: editing.name, color: editing.color } })
            setEditing(null)
            reload()
        } catch (err) {
            toast.error((err as Error).message)
        } finally {
            setBusy(false)
        }
    }
    const remove = async () => {
        const l = removing
        setRemoving(null)
        if (!l) return
        try { await api(`/api/alice/labels/${l.id}`, { method: 'DELETE' }); reload() } catch (err) { toast.error((err as Error).message) }
    }

    return (
        <div className="space-y-4">
            <Notice>Crie as etiquetas aqui e aplique nas conversas na aba <b>Mensagens</b> (menu ⋯ → Etiquetas). Dá para filtrar a lista por etiqueta.</Notice>
            <Panel title="Etiquetas" action={<Button onClick={() => setEditing({ id: null, name: '', color: COLORS[0] })}><Plus className="w-4 h-4" /> Nova</Button>}>
                {error ? <p className="px-5 pb-5 text-[14px] text-red-600">{error}</p> : !data ? <Spinner /> : data.labels.length === 0 ? (
                    <Empty icon={<Tag className="w-5 h-5" />}>Nenhuma etiqueta. Sugestões: Orçamento, Aguardando peça, Retirada, Garantia.</Empty>
                ) : (
                    <ul className="divide-y divide-border/60 border-t border-border/60">
                        {data.labels.map(l => (
                            <li key={l.id} className="px-5 py-3 flex items-center gap-3">
                                <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                                <span className="flex-1 text-[15px] font-medium truncate">{l.name}</span>
                                <button type="button" onClick={() => setEditing({ id: l.id, name: l.name, color: l.color })} aria-label="Editar" className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-foreground/[0.06]"><Pencil className="w-4 h-4" /></button>
                                <button type="button" onClick={() => setRemoving(l)} aria-label="Apagar" className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-foreground/[0.06] hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>
            {editing && (
                <Sheet open onClose={() => setEditing(null)} title={editing.id ? 'Editar etiqueta' : 'Nova etiqueta'}>
                    <div className="space-y-4">
                        <FieldRow label="Nome"><input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} maxLength={40} className={fieldCls} /></FieldRow>
                        <div className="flex flex-wrap gap-2.5">
                            {COLORS.map(c => <button key={c} type="button" aria-label={`Cor ${c}`} onClick={() => setEditing({ ...editing, color: c })} className="w-9 h-9 rounded-full ring-offset-2 ring-offset-card" style={{ backgroundColor: c, boxShadow: editing.color === c ? `0 0 0 2px var(--card), 0 0 0 4px ${c}` : undefined }} />)}
                        </div>
                        <Button busy={busy} disabled={!editing.name.trim()} onClick={save} className="w-full h-12 text-[17px]">Salvar</Button>
                    </div>
                </Sheet>
            )}
            {removing && <PremiumConfirmDialog isOpen title="Apagar etiqueta?" description={`“${removing.name}” sai de todas as conversas.`} confirmLabel="Apagar" variant="danger" onConfirm={remove} onCancel={() => setRemoving(null)} />}
        </div>
    )
}
