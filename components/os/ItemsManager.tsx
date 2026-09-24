'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, Plus, Trash2, Zap, ShoppingBag, Wrench, Package, Info, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import PremiumModal from '@/components/ui/PremiumModal'

interface InventoryItem {
    id: string
    name: string
    selling_price: number
    cost_price: number
    category: string
}

export interface OSItem {
    id?: string
    client_key?: string
    inventory_item_id: string | null
    item_name: string
    quantity: number
    unit_price: number
    unit_cost: number
    total_price: number
    total_cost: number
}

interface Props {
    inventoryItems: InventoryItem[]
    items: OSItem[]
    onChange: (items: OSItem[]) => void
}

export default function ItemsManager({ inventoryItems, items, onChange }: Props) {
    const [isQuickAdd, setIsQuickAdd] = useState(false)
    const [quickName, setQuickName] = useState('')
    const [quickPrice, setQuickPrice] = useState('0')
    const [quickCost, setQuickCost] = useState('0')
    const [query, setQuery] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const [editingItem, setEditingItem] = useState<OSItem | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const filteredItems = query === ''
        ? inventoryItems.slice(0, 5)
        : inventoryItems.filter(item =>
            item.name.toLowerCase().includes(query.toLowerCase()) ||
            item.category.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 10)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const addItem = (invItem: InventoryItem) => {
        const newItem: OSItem = {
            client_key: 'key-' + crypto.randomUUID(),
            inventory_item_id: invItem.id,
            item_name: invItem.name,
            quantity: 1,
            unit_price: invItem.selling_price,
            unit_cost: invItem.cost_price || 0,
            total_price: invItem.selling_price,
            total_cost: invItem.cost_price || 0
        }
        onChange([...items, newItem])
        setQuery('')
        setIsOpen(false)
    }

    const handleQuickAdd = () => {
        if (!quickName.trim()) return
        const newItem: OSItem = {
            client_key: 'key-' + crypto.randomUUID(),
            inventory_item_id: null,
            item_name: quickName,
            quantity: 1,
            unit_price: Number(quickPrice),
            unit_cost: Number(quickCost),
            total_price: Number(quickPrice),
            total_cost: Number(quickCost)
        }
        onChange([...items, newItem])
        setQuickName('')
        setQuickPrice('0')
        setQuickCost('0')
        setIsQuickAdd(false)
    }

    const removeItem = (index: number) => {
        const newItems = [...items]
        newItems.splice(index, 1)
        onChange(newItems)
    }

    const updateItem = (index: number, updates: Partial<OSItem>) => {
        const newItems = [...items]
        const updatedItem = { ...newItems[index], ...updates }
        updatedItem.total_price = (updatedItem.quantity || 0) * (updatedItem.unit_price || 0)
        updatedItem.total_cost = (updatedItem.quantity || 0) * (updatedItem.unit_cost || 0)
        newItems[index] = updatedItem
        onChange(newItems)
    }

    const openEditModal = (index: number) => {
        setEditingIndex(index)
        setEditingItem({ ...items[index] })
    }

    const handleSaveEdit = () => {
        if (editingIndex !== null && editingItem) {
            if (!editingItem.item_name.trim()) return
            const newItems = [...items]
            newItems[editingIndex] = {
                ...editingItem,
                total_price: editingItem.quantity * editingItem.unit_price,
                total_cost: editingItem.quantity * editingItem.unit_cost
            }
            onChange(newItems)
            setEditingIndex(null)
            setEditingItem(null)
        }
    }

    const total = items.reduce((acc, item) => acc + (item.total_price || 0), 0)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                        <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-muted-foreground tracking-tight ">Peças e Serviços</h2>
                        <p className="text-[11px] text-muted-foreground font-medium">Gerencie os itens vinculados a esta ordem de serviço</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Search & Add Section */}
                <div className="lg:col-span-5 space-y-4">
                    {!isQuickAdd ? (
                        <div ref={containerRef} className="relative">
                            <label className="block text-[13px] font-medium text-muted-foreground mb-2 px-1">Buscar no Estoque ou Serviço</label>
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-indigo-500 transition-colors" />
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => {
                                        setQuery(e.target.value)
                                        setIsOpen(true)
                                    }}
                                    onFocus={() => setIsOpen(true)}
                                    placeholder="Nome da peça ou serviço..."
                                    className="w-full h-14 bg-card/40 border border-border rounded-2xl pl-12 pr-14 md:text-sm text-base font-bold placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setQuickName(query)
                                        setIsQuickAdd(true)
                                    }}
                                    title="Adição Rápida (Item fora do estoque)"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-all active:scale-90"
                                >
                                    <Zap className="w-4 h-4 fill-current" />
                                </button>
                            </div>

                            {isOpen && (query || filteredItems.length > 0) && (
                                <div className="absolute z-[100] mt-2 w-full overflow-hidden rounded-3xl bg-card border border-border shadow-2xl backdrop-blur-3xl animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="max-h-64 overflow-y-auto p-2 scrollbar-hide">
                                        {filteredItems.map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => addItem(item)}
                                                className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-indigo-500/5 group transition-all text-left border border-transparent hover:border-indigo-500/10"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:bg-indigo-500/10 group-hover:text-indigo-500 transition-all">
                                                    {item.category?.toLowerCase().includes('serviço') ? <Wrench className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-xs font-bold text-foreground truncate">{item.name}</p>
                                                    <p className="text-[11px] text-muted-foreground uppercase font-black tracking-tighter">{item.category || 'Peça'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-black text-indigo-500">R$ {item.selling_price.toFixed(2)}</p>
                                                </div>
                                            </button>
                                        ))}
                                        {query && !inventoryItems.some(i => i.name.toLowerCase() === query.toLowerCase()) && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setQuickName(query)
                                                    setIsQuickAdd(true)
                                                }}
                                                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-amber-500/5 hover:bg-amber-500/10 group transition-all text-left border border-dashed border-amber-500/20 mt-1"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600">
                                                    <Zap className="w-4 h-4 fill-current" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-xs font-bold text-amber-700">Adição Rápida</p>
                                                    <p className="text-[11px] text-amber-600/60 font-black uppercase tracking-widest">Configurar item fora do estoque</p>
                                                </div>
                                                <Plus className="w-4 h-4 text-amber-500" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="p-6 rounded-3xl bg-amber-500/5 border-2 border-amber-500/20 space-y-4 animate-in duration-200 shadow-xl shadow-amber-500/5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <Zap className="w-24 h-24 fill-current text-amber-500" />
                            </div>

                            <div className="flex items-center justify-between mb-4 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-600">
                                        <Zap className="w-4 h-4 fill-current" />
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-widest text-amber-700">Serviço Rápido (O RAIO)</span>
                                </div>
                                <button 
 onClick={() => setIsQuickAdd(false)}
 className="px-3 py-1.5 rounded-lg hover:bg-white/10 text-[13px] font-black text-muted-foreground hover:text-foreground transition-all"
 >
                                    Fechar
                                </button>
                            </div>
                            
                            <div className="space-y-4 relative z-10">
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-medium text-amber-700/60 px-1">Descrição do Serviço / Peça</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={quickName}
                                        onChange={(e) => setQuickName(e.target.value)}
                                        placeholder="Ex: Troca de tela iPhone 13..."
                                        className="w-full h-12 bg-white/40 border border-amber-500/20 rounded-xl px-4 md:text-sm text-base font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-medium text-amber-700/60 px-1">Custo (Opcional)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[11px] font-black text-amber-700/40">R$</span>
                                            <input
                                                type="number"
                                                value={quickCost}
                                                onChange={(e) => setQuickCost(e.target.value)}
                                                className="w-full h-12 bg-white/40 border border-amber-500/20 rounded-xl pl-10 pr-4 md:text-sm text-base font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-medium text-amber-700/60 px-1">Preço de Venda *</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[11px] font-black text-amber-700/40">R$</span>
                                            <input
                                                type="number"
                                                value={quickPrice}
                                                onChange={(e) => setQuickPrice(e.target.value)}
                                                className="w-full h-12 bg-white/40 border border-amber-500/20 rounded-xl pl-10 pr-4 md:text-sm text-base font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
 type="button"
 onClick={handleQuickAdd}
 className="w-full h-14 bg-amber-500 text-white rounded-2xl text-xs font-black shadow-xl shadow-amber-500/20 hover:bg-amber-600 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-3 mt-2"
 >
                                    <Plus className="w-5 h-5" />
                                    Confirmar Adição
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="p-5 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 space-y-3">
                        <div className="flex items-center gap-2 text-indigo-500">
                            <Info className="w-4 h-4" />
                            <span className="text-[11px] font-black uppercase tracking-widest">Informação</span>
                        </div>
                        <p className="text-[11px] text-indigo-900/60 leading-relaxed font-medium">
                            Itens adicionados via <span className="font-bold text-amber-600">Zap (Raio)</span> são exclusivos desta OS e não gerenciam estoque. Use para serviços rápidos ou peças esporádicas.
                        </p>
                    </div>
                </div>

                {/* Items List Section */}
                <div className="lg:col-span-7">
                    <div className="space-y-4">
                        {/* Desktop Table */}
                        <div className="hidden md:block bg-card/20 border border-border/50 rounded-3xl overflow-hidden">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-border/50">
                                        <th className="text-[11px] font-black text-muted-foreground uppercase tracking-widest p-4 text-left">Item</th>
                                        <th className="text-[11px] font-black text-muted-foreground uppercase tracking-widest p-4 text-center w-20">Qtd</th>
                                        <th className="text-[11px] font-black text-muted-foreground uppercase tracking-widest p-4 text-right w-28">Custo Unit.</th>
                                        <th className="text-[11px] font-black text-muted-foreground uppercase tracking-widest p-4 text-right w-28">Preço Venda</th>
                                        <th className="text-[11px] font-black text-muted-foreground uppercase tracking-widest p-4 text-right w-28">Total</th>
                                        <th className="w-24 p-4"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                    {items.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center">
                                                <div className="flex flex-col items-center gap-3 opacity-20">
                                                    <ShoppingBag className="w-8 h-8" />
                                                    <p className="text-[11px] font-black uppercase tracking-wider">Nenhum item adicionado</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        items.map((item, index) => (
                                            <tr key={item.client_key || item.id || `item-${index}`} className="group hover:bg-white/5 transition-all">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        {item.inventory_item_id ? (
                                                            <Package className="w-3 h-3 text-indigo-400" />
                                                        ) : (
                                                            <Zap className="w-3 h-3 text-amber-500 fill-current" />
                                                        )}
                                                        <span className="text-xs font-bold text-foreground/80">{item.item_name}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center text-xs font-black text-foreground">
                                                    {item.quantity}
                                                </td>
                                                <td className="p-4 text-right text-xs font-bold text-amber-600">
                                                    R$ {item.unit_cost.toFixed(2)}
                                                </td>
                                                <td className="p-4 text-right text-xs font-bold text-indigo-500">
                                                    R$ {item.unit_price.toFixed(2)}
                                                </td>
                                                <td className="p-4 text-right text-xs font-black text-foreground">
                                                    R$ {item.total_price.toFixed(2)}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditModal(index)}
                                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-indigo-500/60 hover:text-indigo-500 hover:bg-indigo-500/10 transition-all"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItem(index)}
                                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                {items.length > 0 && (
                                    <tfoot className="bg-muted/5 border-t border-border/50">
                                        <tr>
                                            <td colSpan={4} className="p-6 text-right text-[11px] font-black text-muted-foreground uppercase tracking-widest">Subtotal Geral</td>
                                            <td className="p-6 text-right whitespace-nowrap">
                                                <span className="text-lg font-black text-indigo-500 tracking-tighter">R$ {total.toFixed(2)}</span>
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>

                        {/* Mobile List Card View */}
                        <div className="md:hidden space-y-4">
                            {items.length === 0 ? (
                                <div className="p-12 text-center bg-card/20 border border-border/50 rounded-3xl">
                                    <div className="flex flex-col items-center gap-3 opacity-20">
                                        <ShoppingBag className="w-8 h-8" />
                                        <p className="text-[11px] font-black uppercase tracking-wider">Nenhum item adicionado</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {items.map((item, index) => (
                                        <div key={item.client_key || item.id || `item-${index}`} className="p-5 rounded-3xl bg-card/40 border border-border/50 relative overflow-hidden space-y-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-2">
                                                    {item.inventory_item_id ? (
                                                        <Package className="w-4 h-4 text-indigo-400" />
                                                    ) : (
                                                        <Zap className="w-4 h-4 text-amber-500 fill-current" />
                                                    )}
                                                    <div>
                                                        <p className="text-xs font-bold text-foreground">{item.item_name}</p>
                                                        <p className="text-[11px] font-black uppercase text-muted-foreground tracking-wider">
                                                            {item.inventory_item_id ? 'Estoque' : 'Serviço Rápido'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditModal(index)}
                                                        className="w-8 h-8 flex items-center justify-center text-indigo-500 rounded-lg hover:bg-indigo-500/10 transition-all"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(index)}
                                                        className="w-8 h-8 flex items-center justify-center text-rose-500 rounded-lg hover:bg-rose-500/10 transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-center">
                                                <div>
                                                    <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest block mb-0.5">Custo</span>
                                                    <span className="text-xs font-black text-amber-600">R$ {item.unit_cost.toFixed(2)}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest block mb-0.5">Venda</span>
                                                    <span className="text-xs font-black text-indigo-500">R$ {item.unit_price.toFixed(2)}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest block mb-0.5">Total</span>
                                                    <span className="text-xs font-black text-foreground">R$ {item.total_price.toFixed(2)}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                                <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Quantidade</span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={item.quantity <= 1}
                                                        onClick={() => updateItem(index, { quantity: Math.max(1, item.quantity - 1) })}
                                                        className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center font-black text-foreground hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all text-xs"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="text-xs font-black text-foreground tabular-nums w-4 text-center">{item.quantity}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateItem(index, { quantity: item.quantity + 1 })}
                                                        className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center font-black text-foreground hover:bg-white/10 active:scale-95 transition-all text-xs"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    <div className="p-5 rounded-3xl bg-muted/5 border border-border/50 flex justify-between items-center">
                                        <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Subtotal Geral</span>
                                        <span className="text-lg font-black text-indigo-500 tracking-tighter">R$ {total.toFixed(2)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Premium Edit Modal */}
            <PremiumModal
                isOpen={editingIndex !== null}
                onClose={() => {
                    setEditingIndex(null)
                    setEditingItem(null)
                }}
                title="Editar Item"
                subtitle={editingItem?.inventory_item_id ? "Peça de Estoque" : "Serviço Rápido"}
            >
                {editingItem && (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[13px] font-medium text-muted-foreground block">Nome / Descrição</label>
                            <input
                                type="text"
                                disabled={!!editingItem.inventory_item_id}
                                value={editingItem.item_name}
                                onChange={(e) => setEditingItem({ ...editingItem, item_name: e.target.value })}
                                className="w-full h-12 bg-white/5 border border-border rounded-xl px-4 md:text-sm text-base font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 disabled:bg-transparent transition-all"
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[13px] font-medium text-muted-foreground block font-medium text-amber-600">Custo Unitário</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[11px] font-black text-amber-600/40">R$</span>
                                    <input
                                        type="number"
                                        value={editingItem.unit_cost ?? ''}
                                        onChange={(e) => setEditingItem({ ...editingItem, unit_cost: Number(e.target.value) })}
                                        className="w-full h-12 bg-white/5 border border-border rounded-xl pl-10 pr-4 md:text-sm text-base font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all text-amber-600"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[13px] font-medium text-muted-foreground block font-medium text-indigo-500">Preço de Venda</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[11px] font-black text-indigo-500/40">R$</span>
                                    <input
                                        type="number"
                                        value={editingItem.unit_price ?? ''}
                                        onChange={(e) => setEditingItem({ ...editingItem, unit_price: Number(e.target.value) })}
                                        className="w-full h-12 bg-white/5 border border-border rounded-xl pl-10 pr-4 md:text-sm text-base font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-indigo-600"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                            <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Quantidade</span>
                            <div className="flex items-center gap-4">
                                <button
                                    type="button"
                                    disabled={editingItem.quantity <= 1}
                                    onClick={() => setEditingItem({ ...editingItem, quantity: Math.max(1, editingItem.quantity - 1) })}
                                    className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-bold text-foreground hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all"
                                >
                                    -
                                </button>
                                <span className="text-sm font-black text-foreground tabular-nums w-6 text-center">{editingItem.quantity}</span>
                                <button
                                    type="button"
                                    onClick={() => setEditingItem({ ...editingItem, quantity: editingItem.quantity + 1 })}
                                    className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-bold text-foreground hover:bg-white/10 active:scale-95 transition-all"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                        
                        <button
 type="button"
 onClick={handleSaveEdit}
 className="w-full h-14 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl text-xs font-black shadow-xl shadow-indigo-500/20 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-3 mt-4"
 >
                            Confirmar Alterações
                        </button>
                    </div>
                )}
            </PremiumModal>
        </div>
    )
}
