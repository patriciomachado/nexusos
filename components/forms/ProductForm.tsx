'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { toast } from 'sonner'
import { Package, Save, X, Camera, Image as ImageIcon, Loader2, Plus } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

import PremiumAutocomplete from '@/components/ui/PremiumAutocomplete'

const PRODUCT_SUGGESTIONS = [
    // Películas
    'Película de Vidro 3D', 'Película de Cerâmica', 'Película de Privacidade', 'Película de Hidrogel',
    // Áudio
    'Fone de Ouvido Bluetooth TWS', 'Fone de Ouvido com Fio Lightning', 'Fone de Ouvido Gamer P2', 'Caixa de Som Bluetooth à Prova d\'água', 'Headset Gamer 7.1',
    // Energia
    'Carregador Turbo 20W USB-C', 'Carregador iPhone Original', 'Cabo USB-C para Lightning', 'Cabo USB para USB-C Turbo', 'Power Bank 10000mAh', 'Carregador por Indução (Wireless)',
    // Proteção/Acessórios
    'Capa de Silicone Transparente', 'Capa Anti-Impacto', 'Suporte Veicular Magnético', 'Smartwatch Serie 9', 'Pulseira para Smartwatch Nylon',
    // Peças/Componentes
    'Tela iPhone 11 Incell', 'Bateria iPhone XR Gold', 'Conector de Carga Moto G30', 'SSD 240GB Sata III', 'Memória RAM 8GB DDR4 Notebook'
]

interface ProductFormProps {
    productId?: string
    initialData?: any
}

export default function ProductForm({ productId, initialData }: ProductFormProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [form, setForm] = useState({
        name: '',
        sku: '',
        description: '',
        category: '',
        cost_price: '',
        selling_price: '',
        quantity_in_stock: '0',
        minimum_quantity: '1',
        maximum_quantity: '999',
        unit: 'un',
        barcode: '',
        image_url: '',
    })

    const [photo, setPhoto] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [categories, setCategories] = useState<string[]>([])
    const [isAddingCategory, setIsAddingCategory] = useState(false)

    useEffect(() => {
        if (initialData) {
            setForm({
                name: initialData.name || '',
                sku: initialData.sku || '',
                description: initialData.description || '',
                category: initialData.category || '',
                cost_price: initialData.cost_price?.toString() || '',
                selling_price: initialData.selling_price?.toString() || '',
                quantity_in_stock: initialData.quantity_in_stock?.toString() || '0',
                minimum_quantity: initialData.minimum_quantity?.toString() || '1',
                maximum_quantity: initialData.maximum_quantity?.toString() || '999',
                unit: initialData.unit || 'un',
                barcode: initialData.barcode || '',
                image_url: initialData.image_url || '',
            })
        }
        fetchCategories()
    }, [initialData])

    async function fetchCategories() {
        try {
            const res = await fetch('/api/inventory/categories')
            const data = await res.json()
            if (Array.isArray(data)) {
                const names = data.map((c: any) => c.name)
                setCategories(names.sort())
            }
        } catch (error) {
            console.error('Error fetching categories:', error)
            setCategories([])
        }
    }

    async function handleAddCategory(value: string) {
        if (value && !categories.includes(value)) {
            setIsAddingCategory(true)
            try {
                const res = await fetch('/api/inventory/categories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: value })
                })
                if (res.ok) {
                    toast.success('Categoria adicionada!')
                    await fetchCategories()
                    setForm(p => ({ ...p, category: value }))
                }
            } catch (error) {
                console.error('Error adding category:', error)
            } finally {
                setIsAddingCategory(false)
            }
        }
    }

    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items
            if (!items) return

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const blob = items[i].getAsFile()
                    if (blob) {
                        setPhoto(blob)
                        toast.success('Imagem colada com sucesso!')
                    }
                }
            }
        }

        window.addEventListener('paste', handlePaste)
        return () => window.removeEventListener('paste', handlePaste)
    }, [])

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
        setForm(p => ({ ...p, [e.target.name]: e.target.value }))
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        startTransition(async () => {
            let finalImageUrl = form.image_url

            // 1. Upload photo if selected
            if (photo) {
                setIsUploading(true)
                try {
                    const fileExt = photo.name.split('.').pop()
                    const fileName = `${Date.now()}.${fileExt}`
                    const filePath = `products/${fileName}`

                    const { data, error } = await supabase.storage
                        .from('product-images')
                        .upload(filePath, photo)

                    if (error) throw error

                    const { data: { publicUrl } } = supabase.storage
                        .from('product-images')
                        .getPublicUrl(data.path)

                    finalImageUrl = publicUrl
                } catch (err: any) {
                    toast.error('Erro no upload da imagem: ' + err.message)
                    setIsUploading(false)
                    return
                }
                setIsUploading(false)
            }

            const url = productId ? `/api/inventory/${productId}` : '/api/inventory'
            const method = productId ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    image_url: finalImageUrl,
                    cost_price: parseFloat(form.cost_price) || 0,
                    selling_price: parseFloat(form.selling_price) || 0,
                    quantity_in_stock: parseFloat(form.quantity_in_stock) || 0,
                    minimum_quantity: parseFloat(form.minimum_quantity) || 0,
                    maximum_quantity: parseFloat(form.maximum_quantity) || 999,
                }),
            })

            const data = await res.json()
            if (res.ok) {
                toast.success(productId ? 'Produto atualizado!' : 'Produto cadastrado!')
                router.push('/inventory')
                router.refresh()
            } else {
                toast.error(data.error || 'Erro ao processar produto')
            }
        })
    }

    const profit = (parseFloat(form.selling_price) || 0) - (parseFloat(form.cost_price) || 0)
    const margin = parseFloat(form.selling_price) > 0 ? (profit / parseFloat(form.selling_price)) * 100 : 0

    function applyMarkup(percent: number) {
        const cost = parseFloat(form.cost_price) || 0
        if (cost > 0) {
            const selling = cost * (1 + percent / 100)
            setForm(p => ({ ...p, selling_price: selling.toFixed(2) }))
        } else {
            toast.error('Informe o preço de custo primeiro')
        }
    }

    return (
        <div className="animate-fade-in pb-10">
            <Header
                title={productId ? `Editando: ${form.name || 'Produto'}` : 'Novo Cadastro de Produto'}
                subtitle={productId ? 'Atualize as informações do registro selecionado' : 'Preencha os dados para adicionar ao estoque'}
            />

            <form onSubmit={handleSubmit} className="p-4 max-w-5xl mx-auto space-y-6 mt-4">
                <div className="bg-card/40 border border-border/50 rounded-[2.5rem] p-6 backdrop-blur-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 blur-[120px] rounded-full transition-all group-hover:bg-indigo-500/10" />

                    <div className="relative z-10 space-y-6">
                        <div className="flex items-center gap-3 border-b border-border/50 pb-4">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                <Package className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-muted-foreground tracking-tight uppercase tracking-widest">Identificação do Produto</h2>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 space-y-4">
                                <div>
                                    <label className="block text-[9px] font-black text-muted-foreground/50 mb-1.5 uppercase tracking-widest">NOME DO PRODUTO *</label>
                                    <PremiumAutocomplete
                                        value={form.name}
                                        onChange={val => setForm(p => ({ ...p, name: val }))}
                                        options={PRODUCT_SUGGESTIONS}
                                        placeholder="Ex: Tela iPhone 11 Incell"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[9px] font-black text-muted-foreground/50 mb-1.5 uppercase tracking-widest">SKU / CÓDIGO INTERNO</label>
                                        <input name="sku" value={form.sku} onChange={handleChange} className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-all font-mono uppercase" placeholder="TELA-IP11-INC" />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-muted-foreground/50 mb-1.5 uppercase tracking-widest">CATEGORIA</label>
                                        <PremiumAutocomplete
                                            value={form.category}
                                            onChange={val => setForm(p => ({ ...p, category: val }))}
                                            onAdd={handleAddCategory}
                                            isAdding={isAddingCategory}
                                            options={categories}
                                            placeholder="Ex: Peças"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 shadow-inner">
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-3">Análise de Lucratividade</p>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] text-muted-foreground/60 font-bold">LUCRO BRUTO:</span>
                                            <span className={`text-sm font-black tracking-tight ${profit > 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-muted-foreground/20'}`}>
                                                {formatCurrency(profit)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] text-muted-foreground/60 font-bold">MARGEM:</span>
                                            <span className={`text-sm font-black tracking-tight ${margin > 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-muted-foreground/20'}`}>
                                                {margin.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="h-1 bg-muted rounded-full overflow-hidden mt-2">
                                            <div
                                                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
                                                style={{ width: `${Math.min(Math.max(margin, 0), 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-[9px] font-black text-muted-foreground/50 mb-1.5 uppercase tracking-widest italic">Imagem do Produto</label>
                                <div className="relative group/photo h-full min-h-[160px]">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 opacity-0 cursor-pointer z-20"
                                        onChange={e => setPhoto(e.target.files?.[0] || null)}
                                    />
                                    <div className="h-full min-h-[160px] rounded-3xl border-2 border-dashed border-border/50 bg-white/5 flex flex-col items-center justify-center gap-3 group-hover/photo:border-primary/30 transition-all overflow-hidden relative">
                                        {photo ? (
                                            <img src={URL.createObjectURL(photo)} alt="Preview" className="w-full h-full object-cover" />
                                        ) : form.image_url ? (
                                            <img src={form.image_url} alt="Produto" className="w-full h-full object-cover" />
                                        ) : (
                                            <>
                                                <div className="p-3 rounded-2xl bg-primary/5 text-primary/30">
                                                    <Camera className="w-8 h-8" />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest leading-relaxed">
                                                        Clique para escolher<br />
                                                        <span className="text-primary/40">ou pressione Ctrl+V para colar</span>
                                                    </p>
                                                    <p className="text-[8px] text-muted-foreground/20 uppercase mt-2">PNG, JPG ou WebP</p>
                                                </div>
                                            </>
                                        )}
                                        {(photo || form.image_url) && (
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                                <div className="flex flex-col items-center gap-2">
                                                    <ImageIcon className="w-5 h-5 text-white" />
                                                    <span className="text-[9px] font-black text-white uppercase tracking-widest leading-none">Substituir Imagem</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-border">
                            <div className="md:col-span-1">
                                <label className="block text-[9px] font-black text-muted-foreground/50 mb-1.5 uppercase tracking-widest">PREÇO DE CUSTO</label>
                                <input type="number" step="0.01" name="cost_price" value={form.cost_price} onChange={handleChange} className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground font-bold tracking-tight focus:outline-none focus:border-primary/50 transition-all" placeholder="0,00" />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-[9px] font-black text-muted-foreground/50 mb-1.5 uppercase tracking-widest">PREÇO DE VENDA</label>
                                <input type="number" step="0.01" name="selling_price" value={form.selling_price} onChange={handleChange} className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground font-bold tracking-tight focus:outline-none focus:border-primary/50 transition-all" placeholder="0,00" />
                            </div>
                            <div className="md:col-span-2 flex flex-col justify-end">
                                <p className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest mb-2">Sugestão de Lucro (Markup)</p>
                                <div className="flex gap-2">
                                    {[30, 50, 100].map(p => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => applyMarkup(p)}
                                            className="grow py-2 rounded-lg bg-primary/5 border border-primary/10 text-primary text-[9px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all"
                                        >
                                            +{p}%
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-[9px] font-black text-muted-foreground/50 mb-1.5 uppercase tracking-widest">QTD EM ESTOQUE</label>
                                <input type="number" step="0.001" name="quantity_in_stock" value={form.quantity_in_stock} onChange={handleChange} className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-all font-bold" />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-muted-foreground/50 mb-1.5 uppercase tracking-widest">UNIDADE</label>
                                <select name="unit" value={form.unit} onChange={handleChange} className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-all">
                                    <option value="un">un</option>
                                    <option value="pc">pc</option>
                                    <option value="par">par</option>
                                    <option value="cx">cx</option>
                                    <option value="kg">kg</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-muted-foreground/50 mb-1.5 uppercase tracking-widest">ESTOQUE MÍNIMO</label>
                                <input type="number" step="0.001" name="minimum_quantity" value={form.minimum_quantity} onChange={handleChange} className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-all" />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-muted-foreground/50 mb-1.5 uppercase tracking-widest">CÓDIGO DE BARRAS</label>
                                <input name="barcode" value={form.barcode} onChange={handleChange} className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-all font-mono" placeholder="Opcional..." />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <button type="submit" disabled={isPending || isUploading} className="w-full sm:flex-1 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 disabled:opacity-50 text-white p-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-500/20 transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2">
                        {(isPending || isUploading) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {(isPending || isUploading) ? 'PROCESSANDO...' : (productId ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR PRODUTO')}
                    </button>
                    <button type="button" onClick={() => router.back()} className="w-full sm:w-auto px-10 py-4 rounded-xl border border-border bg-card text-foreground/40 font-black text-[10px] uppercase tracking-widest hover:bg-muted hover:text-foreground transition-all flex items-center justify-center gap-2">
                        <X className="w-4 h-4" />
                        ABORTAR
                    </button>
                </div>
            </form>
        </div>
    )
}
