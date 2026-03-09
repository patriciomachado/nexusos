'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { toast } from 'sonner'
import { Package, Save, X } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

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

const CATEGORY_SUGGESTIONS = [
    'Acessórios', 'Peças de Reposição', 'Periféricos', 'Gadgets', 'Cabos e Adaptadores', 'Áudio', 'Energia', 'Smartphones', 'Notebooks', 'Software'
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
    })

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
            })
        }
    }, [initialData])

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
        setForm(p => ({ ...p, [e.target.name]: e.target.value }))
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        startTransition(async () => {
            const url = productId ? `/api/inventory/${productId}` : '/api/inventory'
            const method = productId ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
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
            <Header title={productId ? 'Editar Registro de Produto' : 'Novo Cadastro de Produto'} />

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
                                            options={CATEGORY_SUGGESTIONS}
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
                    <button type="submit" disabled={isPending} className="w-full sm:flex-1 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 disabled:opacity-50 text-white p-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-500/20 transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2">
                        {isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                        {isPending ? 'PROCESSANDO...' : (productId ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR PRODUTO')}
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
