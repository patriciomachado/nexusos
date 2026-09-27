'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, MessageCircle, Plus, Trash2 } from 'lucide-react'
import Sheet from '@/components/tasks/Sheet'
import { Field, Group, PrimaryButton, SecondaryButton, TextArea, TextInput, brl } from '@/components/ui/form'
import { cn } from '@/lib/utils'
import { qty, send, waLink, type Supplier } from './shared'

/** Suppliers with what the store bought and how often their parts fail. */
export default function FornecedoresTab({ suppliers, onChanged }: { suppliers: Supplier[] | null; onChanged: () => void }) {
    const [editing, setEditing] = useState<Supplier | 'new' | null>(null)
    if (!suppliers) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>

    const rated = suppliers.filter(s => s.defect_rate != null)
    const best = rated.length > 1 ? [...rated].sort((a, b) => (a.defect_rate ?? 0) - (b.defect_rate ?? 0))[0] : null

    return (
        <div className="space-y-4">
            <PrimaryButton onClick={() => setEditing('new')} className="w-full"><Plus className="w-5 h-5" /> Novo fornecedor</PrimaryButton>
            {suppliers.length === 0 ? (
                <p className="text-center text-[15px] text-muted-foreground py-8">Cadastre seus fornecedores para pedir peças pelo WhatsApp, comparar preços e ver quem manda peça com defeito.</p>
            ) : (
                <div className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60">
                    {suppliers.map(s => (
                        <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                            <button type="button" onClick={() => setEditing(s)} className="flex-1 min-w-0 text-left">
                                <span className="flex items-center gap-2">
                                    <span className="text-[17px] truncate">{s.name}</span>
                                    {best?.id === s.id && <span className="h-5 px-1.5 rounded-full bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold inline-flex items-center shrink-0">Menos defeitos</span>}
                                </span>
                                <span className="block text-[13px] text-muted-foreground truncate">
                                    {s.orders ? `${s.orders} ${s.orders === 1 ? 'compra' : 'compras'} · ${qty(s.bought ?? 0)} peças · ${brl(s.spent ?? 0)}` : 'Nenhuma compra recebida ainda'}
                                </span>
                                {s.defect_rate != null && (
                                    <span className={cn('block text-[13px]', (s.defect_rate ?? 0) >= 10 ? 'text-red-600' : (s.defect_rate ?? 0) >= 5 ? 'text-amber-600' : 'text-emerald-700 dark:text-emerald-400')}>
                                        {String(s.defect_rate).replace('.', ',')}% com defeito ({qty(s.defects ?? 0)}){s.loss ? ` · prejuízo ${brl(s.loss)}` : ''}
                                    </span>
                                )}
                            </button>
                            {s.phone && (
                                <a href={waLink(s.phone, `Olá, ${s.name}!`)} target="_blank" rel="noreferrer" aria-label={`WhatsApp de ${s.name}`} className="w-10 h-10 rounded-full bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0"><MessageCircle className="w-5 h-5" /></a>
                            )}
                        </div>
                    ))}
                </div>
            )}
            <SupplierForm open={!!editing} supplier={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChanged() }} />
        </div>
    )
}

function SupplierForm({ open, supplier, onClose, onSaved }: { open: boolean; supplier: Supplier | null; onClose: () => void; onSaved: () => void }) {
    const [f, setF] = useState({ name: '', phone: '', notes: '' })
    const [saving, setSaving] = useState(false)
    useEffect(() => {
        if (!open) return
         
        setF({ name: supplier?.name ?? '', phone: supplier?.phone ?? '', notes: supplier?.notes ?? '' })
    }, [open, supplier])

    const save = async () => {
        if (f.name.trim().length < 2) return toast.error('Informe o nome.')
        setSaving(true)
        try {
            await send(supplier ? `/api/parts/suppliers/${supplier.id}` : '/api/parts/suppliers', supplier ? 'PATCH' : 'POST', { name: f.name.trim(), phone: f.phone.trim() || null, notes: f.notes.trim() || null })
            toast.success('Fornecedor salvo')
            onSaved()
        } catch (e) { toast.error((e as Error).message) } finally { setSaving(false) }
    }
    const remove = async () => {
        if (!supplier) return
        try { await send(`/api/parts/suppliers/${supplier.id}`, 'DELETE'); toast.success('Fornecedor arquivado'); onSaved() } catch (e) { toast.error((e as Error).message) }
    }

    return (
        <Sheet open={open} onClose={onClose} title={supplier ? 'Fornecedor' : 'Novo fornecedor'} footer={
            <div className="flex gap-2">
                {supplier && <SecondaryButton onClick={remove} aria-label="Arquivar" className="text-red-600"><Trash2 className="w-5 h-5" /></SecondaryButton>}
                <PrimaryButton onClick={save} disabled={saving} className="flex-1">{saving && <Loader2 className="w-5 h-5 animate-spin" />}Salvar</PrimaryButton>
            </div>
        }>
            <div className="space-y-5">
                <div tabIndex={-1} data-autofocus />
                <Group>
                    <Field label="Nome" htmlFor="sp-name"><TextInput id="sp-name" value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} placeholder="Ex.: Distribuidora Cell" /></Field>
                    <Field label="WhatsApp" htmlFor="sp-phone" hint="Os pedidos vão prontos para esse número."><TextInput id="sp-phone" type="tel" inputMode="tel" value={f.phone} onChange={e => setF(p => ({ ...p, phone: e.target.value }))} placeholder="(11) 98888-7777" /></Field>
                    <Field label="Observações" htmlFor="sp-notes"><TextArea id="sp-notes" rows={2} value={f.notes} onChange={e => setF(p => ({ ...p, notes: e.target.value }))} placeholder="Prazo de entrega, garantia, forma de pagamento…" /></Field>
                </Group>
            </div>
        </Sheet>
    )
}
