'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Plus, Trash2, Loader2, Tag } from 'lucide-react'
import { toast } from 'sonner'
import PremiumConfirmDialog from '@/components/ui/PremiumConfirmDialog'

interface Category {
    id: string
    name: string
}

interface CategoryManagerProps {
    onClose: () => void
}

export default function CategoryManager({ onClose }: CategoryManagerProps) {
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [newCategory, setNewCategory] = useState('')
    const [isAdding, setIsAdding] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        fetchCategories()
    }, [])

    async function fetchCategories() {
        setLoading(true)
        try {
            const res = await fetch('/api/inventory/categories')
            const data = await res.json()
            if (Array.isArray(data)) {
                setCategories(data)
            }
        } catch (error) {
            console.error('Error fetching categories:', error)
            toast.error('Erro ao carregar categorias')
        } finally {
            setLoading(false)
        }
    }

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault()
        if (!newCategory.trim()) return

        setIsAdding(true)
        try {
            const res = await fetch('/api/inventory/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newCategory.trim() })
            })
            if (res.ok) {
                toast.success('Categoria adicionada!')
                setNewCategory('')
                fetchCategories()
            } else {
                const data = await res.json()
                toast.error(data.error || 'Erro ao adicionar categoria')
            }
        } catch (error) {
            console.error('Error adding category:', error)
            toast.error('Erro de conexão')
        } finally {
            setIsAdding(false)
        }
    }

    async function handleDelete(id: string) {
        setDeletingId(id)
        try {
            const res = await fetch(`/api/inventory/categories/${id}`, {
                method: 'DELETE'
            })
            if (res.ok) {
                toast.success('Categoria excluída!')
                fetchCategories()
            } else {
                toast.error('Erro ao excluir categoria')
            }
        } catch (error) {
            console.error('Error deleting category:', error)
            toast.error('Erro de conexão')
        } finally {
            setDeletingId(null)
        }
    }

    if (!mounted) return null

    const modalContent = (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-card w-full max-w-md rounded-[2.5rem] border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300 relative">
                {/* Header */}
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-muted/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                            <Tag className="w-5 h-5" />
                        </div>
                        <h2 className="text-xs font-black text-foreground uppercase tracking-[0.2em]">Gerenciar Categorias</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-muted-foreground hover:text-foreground active:scale-90"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <div className="p-8 border-b border-white/5 bg-muted/10">
                    <form onSubmit={handleAdd} className="flex gap-3">
                        <input
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            placeholder="Nova categoria..."
                            className="flex-1 bg-background/50 border border-white/5 rounded-2xl px-5 py-4 text-xs font-medium focus:outline-none focus:border-primary/50 transition-all placeholder:opacity-30"
                        />
                        <button
                            type="submit"
                            disabled={isAdding || !newCategory.trim()}
                            className="px-5 bg-primary text-primary-foreground rounded-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-xl shadow-primary/20"
                        >
                            {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                        </button>
                    </form>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar min-h-[300px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-20">
                            <Loader2 className="w-10 h-10 animate-spin" />
                        </div>
                    ) : categories.length > 0 ? (
                        <div className="grid gap-3">
                            {categories.map((cat) => (
                                <div key={cat.id} className="flex items-center justify-between p-5 rounded-[1.5rem] bg-white/5 border border-white/5 group hover:border-primary/20 hover:bg-white/[0.07] transition-all">
                                    <span className="text-xs font-black text-foreground/80 tracking-tight uppercase tracking-wider">{cat.name}</span>
                                    <button
                                        onClick={() => setConfirmDeleteId(cat.id)}
                                        disabled={deletingId === cat.id}
                                        className="p-3 text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 disabled:opacity-100"
                                    >
                                        {deletingId === cat.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 opacity-30">
                            <Tag className="w-12 h-12 mx-auto mb-4 opacity-10" />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Nenhuma categoria</p>
                            <p className="text-[8px] font-medium uppercase mt-2 opacity-60">Personalize seu estoque acima</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-muted/40 border-t border-white/5 text-center">
                    <p className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.2em]">As categorias não removerão os produtos existentes.</p>
                </div>
            </div>

            <PremiumConfirmDialog
                isOpen={!!confirmDeleteId}
                title="Excluir Categoria?"
                description="Deseja realmente excluir esta categoria? Isso não removerá os produtos, mas eles ficarão sem categoria definida."
                confirmLabel="Excluir Agora"
                cancelLabel="Manter Categoria"
                onConfirm={() => {
                    if (confirmDeleteId) handleDelete(confirmDeleteId)
                    setConfirmDeleteId(null)
                }}
                onCancel={() => setConfirmDeleteId(null)}
                variant="danger"
            />
        </div>
    )

    return createPortal(modalContent, document.body)
}
