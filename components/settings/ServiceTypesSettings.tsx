'use client'

import { useState, useEffect, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Zap, DollarSign, Loader2 } from 'lucide-react'
import { PremiumInput } from '@/components/ui/PremiumInput'
import PremiumConfirmDialog from '@/components/ui/PremiumConfirmDialog'
import { formatCurrency, cn } from '@/lib/utils'

interface ServiceType {
    id: string
    name: string
    description: string | null
    base_price: number
    company_id: string
}

export default function ServiceTypesSettings() {
    const [services, setServices] = useState<ServiceType[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isPending, startTransition] = useTransition()

    // Form State
    const [newName, setNewName] = useState('')
    const [newPrice, setNewPrice] = useState('')
    const [newDesc, setNewDesc] = useState('')
    const [isAdding, setIsAdding] = useState(false)

    // Confirmation Dialog State
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [stToDelete, setStToDelete] = useState<ServiceType | null>(null)

    useEffect(() => {
        fetchServices()
    }, [])

    async function fetchServices() {
        try {
            const res = await fetch('/api/settings/service-types')
            const data = await res.json()
            setServices(Array.isArray(data) ? data : [])
        } catch (error) {
            toast.error('Erro ao carregar serviços')
        } finally {
            setIsLoading(false)
        }
    }

    async function handleAdd() {
        if (!newName.trim()) return

        startTransition(async () => {
            try {
                const res = await fetch('/api/settings/service-types', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: newName.trim(),
                        description: newDesc.trim(),
                        base_price: parseFloat(newPrice) || 0
                    })
                })

                if (res.ok) {
                    toast.success('Serviço adicionado!')
                    setNewName('')
                    setNewPrice('')
                    setNewDesc('')
                    setIsAdding(false)
                    fetchServices()
                } else {
                    const error = await res.json()
                    toast.error(error.error || 'Erro ao adicionar')
                }
            } catch (error) {
                toast.error('Erro de conexão')
            }
        })
    }

    async function handleDelete(id: string) {
        startTransition(async () => {
            try {
                const res = await fetch(`/api/settings/service-types/${id}`, {
                    method: 'DELETE'
                })
                if (res.ok) {
                    toast.success('Serviço removido')
                    fetchServices()
                } else {
                    const data = await res.json()
                    toast.error(data.error || 'Erro ao excluir')
                }
            } catch (error) {
                toast.error('Erro de conexão')
            }
        })
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-500 shadow-inner">
                        <Zap className="w-6 h-6" />
                    </div>
                    <div className="space-y-0.5">
                        <h2 className="text-2xl font-black tracking-tighter text-foreground uppercase">Modelos de Serviço</h2>
                        <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">Catálogo de especialidades e orçamentos</p>
                    </div>
                </div>

                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="h-12 px-6 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all active:scale-95 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Novo Serviço
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="p-8 rounded-[2.5rem] bg-orange-500/5 border border-orange-500/10 backdrop-blur-3xl shadow-xl animate-in slide-in-from-top-4 duration-500">
                    <div className="grid gap-6">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-2">Nome do Serviço</label>
                                <PremiumInput
                                    placeholder="EX: MANUTENÇÃO PREVENTIVA"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value.toUpperCase())}
                                    className="h-14 bg-background/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-2">Preço Base (Estimado)</label>
                                <PremiumInput
                                    placeholder="0,00"
                                    type="number"
                                    value={newPrice}
                                    onChange={(e) => setNewPrice(e.target.value)}
                                    className="h-14 bg-background/50"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-2">Descrição / Detalhes</label>
                            <PremiumInput
                                placeholder="BREVE DESCRIÇÃO DO QUE ESTÁ INCLUSO..."
                                value={newDesc}
                                onChange={(e) => setNewDesc(e.target.value.toUpperCase())}
                                className="h-14 bg-background/50"
                            />
                        </div>
                        <div className="flex gap-3 justify-end pt-2">
                            <button
                                onClick={() => setIsAdding(false)}
                                className="h-14 px-8 rounded-2xl bg-muted/30 text-muted-foreground font-black text-[10px] uppercase tracking-widest hover:bg-white/5 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAdd}
                                disabled={isPending || !newName.trim()}
                                className="h-14 px-10 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-orange-500/20 transition-all flex items-center gap-2"
                            >
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Salvar Especialidade
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid gap-4">
                {isLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center opacity-30 gap-4">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <p className="text-[10px] font-black uppercase tracking-[0.4em]">Sincronizando Catálogo...</p>
                    </div>
                ) : services.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-4">
                        {services.map((st) => (
                            <div key={st.id} className="group/card relative p-5 rounded-[2.5rem] bg-card/40 border border-white/5 hover:border-orange-500/30 hover:bg-orange-500/5 transition-all duration-500 flex items-center justify-between">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-[40px] rounded-full translate-x-1/4 -translate-y-1/4 opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none" />

                                <div className="flex items-center gap-4 relative z-10 min-w-0">
                                    <div className="w-12 h-12 rounded-2xl bg-background border border-white/5 flex items-center justify-center text-muted-foreground/30 group-hover/card:text-orange-500 group-hover/card:scale-110 transition-all shadow-inner shrink-0">
                                        <Zap className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-0.5 min-w-0">
                                        <p className="text-sm font-black text-foreground tracking-tight group-hover/card:text-orange-500 transition-colors uppercase truncate">{st.name}</p>
                                        {st.description && <p className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-widest truncate">{st.description}</p>}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 relative z-10 shrink-0 ml-4">
                                    <div className="text-right hidden xs:block">
                                        <div className="inline-flex items-center gap-1.5 text-[9px] font-black text-emerald-500 bg-emerald-500/5 px-3 py-1.5 rounded-lg border border-emerald-500/10">
                                            <DollarSign className="w-2.5 h-2.5" />
                                            {formatCurrency(st.base_price)}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setStToDelete(st)
                                            setConfirmOpen(true)
                                        }}
                                        className="p-2.5 rounded-xl text-rose-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all border border-white/5 hover:border-rose-500/20 shadow-sm opacity-100 lg:opacity-0 lg:group-hover/card:opacity-100 active:scale-90"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[2.5rem] bg-white/5">
                        <p className="text-xs text-muted-foreground/30 font-black uppercase tracking-[0.4em]">Nenhum Serviço Configurado</p>
                    </div>
                )}
            </div>

            <PremiumConfirmDialog
                isOpen={confirmOpen}
                title="Remover Serviço"
                description={`Tem certeza que deseja apagar o serviço "${stToDelete?.name}"? Esta ação não pode ser desfeita.`}
                confirmLabel="Apagar Agora"
                cancelLabel="Manter Serviço"
                onConfirm={() => {
                    if (stToDelete) handleDelete(stToDelete.id)
                    setConfirmOpen(false)
                }}
                onCancel={() => setConfirmOpen(false)}
                variant="danger"
            />
        </div>
    )
}
