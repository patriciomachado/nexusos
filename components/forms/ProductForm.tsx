'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { toast } from 'sonner'
import { Camera, Loader2, ScanBarcode } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { Field, Group, PrimaryButton, SecondaryButton, SelectRow, TextArea, TextInput, parseMoney } from '@/components/ui/form'
import BarcodeScannerModal from '@/components/ui/BarcodeScannerModal'
import { compressImage, extensionOf } from '@/lib/images/compress'

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
    const [isScannerOpen, setIsScannerOpen] = useState(false)
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
    const [preview, setPreview] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [categories, setCategories] = useState<string[]>([])
    const [isAddingCategory, setIsAddingCategory] = useState(false)

    useEffect(() => {
        if (photo) {
            const url = URL.createObjectURL(photo)
            setPreview(url)
            return () => URL.revokeObjectURL(url)
        }
        setPreview(null)
    }, [photo])

    useEffect(() => {
        if (initialData) {
            setForm({
                name: initialData.name || '',
                sku: initialData.sku || '',
                description: initialData.description || '',
                category: initialData.category || '',
                cost_price: initialData.cost_price != null ? String(initialData.cost_price).replace('.', ',') : '',
                selling_price: initialData.selling_price != null ? String(initialData.selling_price).replace('.', ',') : '',
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

    const set = (key: keyof typeof form, value: string) => setForm(p => ({ ...p, [key]: value }))
    const decimal = (v: string) => v.replace(/[^\d.,]/g, '')

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!form.name.trim()) { toast.error('Informe o nome do produto'); return }
        startTransition(async () => {
            // A category typed by hand is registered for the next products.
            const category = form.category.trim()
            if (category && !categories.includes(category)) await handleAddCategory(category)
            let finalImageUrl = form.image_url

            // 1. Upload photo if selected
            if (photo) {
                setIsUploading(true)
                try {
                    const file = await compressImage(photo, 'photo')
                    const fileName = `${Date.now()}.${extensionOf(file)}`
                    const filePath = `products/${fileName}`

                    const { data, error } = await supabase.storage
                        .from('product-images')
                        .upload(filePath, file, { contentType: file.type })

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
                    name: form.name.trim(),
                    category: category,
                    cost_price: parseMoney(form.cost_price),
                    selling_price: parseMoney(form.selling_price),
                    quantity_in_stock: parseMoney(form.quantity_in_stock),
                    minimum_quantity: parseMoney(form.minimum_quantity),
                    maximum_quantity: parseMoney(form.maximum_quantity) || 999,
                }),
            })

            const data = await res.json()
            if (res.ok) {
                toast.success(productId ? 'Produto atualizado!' : 'Produto cadastrado!')
                router.push('/inventory')
                router.refresh()
            } else {
                let errorMessage = 'Erro ao processar produto'
                
                if (typeof data.error === 'string') {
                    errorMessage = data.error
                } else if (typeof data.error === 'object' && data.error !== null) {
                    // Tenta formatar erro do Zod (.format())
                    const errorEntries = Object.entries(data.error)
                        .filter(([key]) => key !== '_errors')
                        .map(([key, val]: [string, any]) => {
                            const field = key.toUpperCase()
                            const messages = val._errors?.join(', ') || 'inválido'
                            return `${field}: ${messages}`
                        })
                    
                    if (errorEntries.length > 0) {
                        errorMessage = errorEntries.join(' | ')
                    } else {
                        errorMessage = 'Verifique os campos obrigatórios'
                    }
                }
                
                toast.error(errorMessage, {
                    duration: 5000,
                    description: 'Por favor, revise os dados informados.'
                })
            }
        })
    }

    const selling = parseMoney(form.selling_price)
    const profit = selling - parseMoney(form.cost_price)
    const margin = selling > 0 ? (profit / selling) * 100 : 0

    function applyMarkup(percent: number) {
        const cost = parseMoney(form.cost_price)
        if (cost > 0) {
            setForm(p => ({ ...p, selling_price: (cost * (1 + percent / 100)).toFixed(2).replace('.', ',') }))
        } else {
            toast.error('Informe o preço de custo primeiro')
        }
    }

    const image = preview || form.image_url
    const saving = isPending || isUploading

    return (
        <div className="min-h-full bg-background">
            <Header title={productId ? 'Editar produto' : 'Novo produto'} />

            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 pt-4 pb-16 space-y-5">
                <Group>
                    <div className="flex items-center gap-3 px-4 py-3">
                        <label className="relative w-20 h-20 shrink-0 rounded-xl bg-foreground/[0.05] border border-dashed border-border flex items-center justify-center overflow-hidden cursor-pointer focus-within:ring-2 focus-within:ring-primary/50">
                            {image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={image} alt="Foto do produto" width={80} height={80} className="w-full h-full object-cover" />
                            ) : (
                                <Camera aria-hidden className="w-6 h-6 text-muted-foreground" />
                            )}
                            <input type="file" accept="image/*" className="sr-only" aria-label={image ? 'Trocar foto do produto' : 'Escolher foto do produto'} onChange={e => setPhoto(e.target.files?.[0] || null)} />
                        </label>
                        <div className="min-w-0 text-[13px] text-muted-foreground">
                            <p className="text-[15px] text-foreground">{image ? 'Toque na foto para trocar' : 'Foto do produto'}</p>
                            <p>No computador, também dá para colar uma imagem (Ctrl+V).</p>
                        </div>
                    </div>
                    <Field label="Nome" htmlFor="pf-name">
                        <TextInput id="pf-name" required list="pf-name-suggestions" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex.: Tela iPhone 11 Incell" data-autofocus={!productId || undefined} />
                        <datalist id="pf-name-suggestions">{PRODUCT_SUGGESTIONS.map(n => <option key={n} value={n} />)}</datalist>
                    </Field>
                    <Field label="Categoria" htmlFor="pf-category" hint={isAddingCategory ? 'Salvando categoria…' : undefined}>
                        <TextInput id="pf-category" list="pf-category-list" value={form.category} onChange={e => set('category', e.target.value)} placeholder="Ex.: Peças" />
                        <datalist id="pf-category-list">{categories.map(c => <option key={c} value={c} />)}</datalist>
                    </Field>
                    <Field label="Descrição" htmlFor="pf-desc">
                        <TextArea id="pf-desc" rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Opcional" />
                    </Field>
                </Group>

                <Group title="Preço" footer={selling > 0 ? <>Lucro de <span className="tabular-nums">{formatCurrency(profit)}</span> · margem de <span className="tabular-nums">{margin.toFixed(1).replace('.', ',')}%</span></> : undefined}>
                    <div className="grid grid-cols-2 divide-x divide-border/60">
                        <Field label="Custo (R$)" htmlFor="pf-cost"><TextInput id="pf-cost" inputMode="decimal" value={form.cost_price} onChange={e => set('cost_price', decimal(e.target.value))} placeholder="0,00" className="tabular-nums" /></Field>
                        <Field label="Venda (R$)" htmlFor="pf-sell"><TextInput id="pf-sell" inputMode="decimal" value={form.selling_price} onChange={e => set('selling_price', decimal(e.target.value))} placeholder="0,00" className="tabular-nums" /></Field>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-3">
                        <span className="text-[15px] text-muted-foreground mr-auto">Venda = custo +</span>
                        {[30, 50, 100].map(p => (
                            <button key={p} type="button" onClick={() => applyMarkup(p)} className="h-9 px-3.5 rounded-full bg-foreground/[0.06] text-[15px] font-medium tabular-nums hover:bg-foreground/[0.1] transition-colors">
                                {p}%
                            </button>
                        ))}
                    </div>
                </Group>

                <Group title="Estoque">
                    <div className="grid grid-cols-2 divide-x divide-border/60">
                        <Field label="Quantidade" htmlFor="pf-qty"><TextInput id="pf-qty" inputMode="decimal" value={form.quantity_in_stock} onChange={e => set('quantity_in_stock', decimal(e.target.value))} className="tabular-nums" /></Field>
                        <Field label="Avisar abaixo de" htmlFor="pf-min"><TextInput id="pf-min" inputMode="decimal" value={form.minimum_quantity} onChange={e => set('minimum_quantity', decimal(e.target.value))} className="tabular-nums" /></Field>
                    </div>
                    <SelectRow
                        id="pf-unit"
                        label="Unidade"
                        value={form.unit}
                        onChange={v => set('unit', v || 'un')}
                        options={[{ value: 'un', label: 'Unidade (un)' }, { value: 'pc', label: 'Peça (pc)' }, { value: 'par', label: 'Par' }, { value: 'cx', label: 'Caixa (cx)' }, { value: 'kg', label: 'Quilo (kg)' }]}
                    />
                </Group>

                <Group title="Códigos">
                    <Field label="SKU / código interno" htmlFor="pf-sku"><TextInput id="pf-sku" spellCheck={false} value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="TELA-IP11-INC" className="font-mono" /></Field>
                    <div className="flex items-center gap-2 pr-2">
                        <Field label="Código de barras" htmlFor="pf-barcode" className="flex-1">
                            <TextInput id="pf-barcode" inputMode="numeric" spellCheck={false} value={form.barcode} onChange={e => set('barcode', e.target.value)} placeholder="7890000000000" className="font-mono" />
                        </Field>
                        <button type="button" onClick={() => setIsScannerOpen(true)} aria-label="Ler código de barras com a câmera" className="w-11 h-11 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/15 transition-colors">
                            <ScanBarcode aria-hidden className="w-5 h-5" />
                        </button>
                    </div>
                </Group>

                <BarcodeScannerModal
                    isOpen={isScannerOpen}
                    onClose={() => setIsScannerOpen(false)}
                    onScan={(code) => setForm(p => ({ ...p, barcode: code, sku: p.sku ? p.sku : code }))}
                    title="Ler código do produto"
                />

                <div className="flex gap-2">
                    <SecondaryButton onClick={() => router.back()}>Cancelar</SecondaryButton>
                    <PrimaryButton type="submit" className={cn('flex-1')} disabled={saving}>
                        {saving && <Loader2 aria-hidden className="w-5 h-5 animate-spin" />}
                        {saving ? 'Salvando…' : productId ? 'Salvar' : 'Cadastrar produto'}
                    </PrimaryButton>
                </div>
            </form>
        </div>
    )
}
