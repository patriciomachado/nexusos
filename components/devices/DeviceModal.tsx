'use client'

import { useState, useEffect } from 'react'
import { X, Smartphone, DollarSign, ShieldCheck, Check, Sparkles, AlertCircle, Image as ImageIcon, Plus, Trash2, Upload, Camera } from 'lucide-react'
import { Device } from '@/types/devices'
import { toast } from 'sonner'

interface DeviceModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: () => void
    deviceToEdit?: Device | null
}

export default function DeviceModal({ isOpen, onClose, onSave, deviceToEdit }: DeviceModalProps) {
    const [brand, setBrand] = useState('Apple')
    const [model, setModel] = useState('')
    const [storage, setStorage] = useState('128GB')
    const [color, setColor] = useState('')
    const [condition, setCondition] = useState<'novo_lacrado' | 'seminovo_a' | 'seminovo_b' | 'recondicionado'>('seminovo_a')
    const [batteryHealth, setBatteryHealth] = useState<number>(88)
    const [imei1, setImei1] = useState('')
    const [imei2, setImei2] = useState('')
    const [serialNumber, setSerialNumber] = useState('')
    const [costPrice, setCostPrice] = useState('')
    const [cashPrice, setCashPrice] = useState('')
    const [installmentPrice, setInstallmentPrice] = useState('')
    const [status, setStatus] = useState<'disponivel' | 'vendido' | 'reservado' | 'em_revisao'>('disponivel')
    
    // Images array
    const [images, setImages] = useState<string[]>([])
    const [newImageUrl, setNewImageUrl] = useState('')

    // Checkbox items
    const [box, setBox] = useState(true)
    const [cable, setCable] = useState(true)
    const [charger, setCharger] = useState(false)
    const [warranty, setWarranty] = useState(true)

    // Technical Passport
    const [isRevised, setIsRevised] = useState(true)
    const [warrantyMonths, setWarrantyMonths] = useState(6)
    const [replacedParts, setReplacedParts] = useState('')

    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (deviceToEdit) {
            setBrand(deviceToEdit.brand || 'Apple')
            setModel(deviceToEdit.model || '')
            setStorage(deviceToEdit.storage || '128GB')
            setColor(deviceToEdit.color || '')
            setCondition(deviceToEdit.condition || 'seminovo_a')
            setBatteryHealth(deviceToEdit.battery_health || 100)
            setImei1(deviceToEdit.imei_1 || '')
            setImei2(deviceToEdit.imei_2 || '')
            setSerialNumber(deviceToEdit.serial_number || '')
            setCostPrice(deviceToEdit.cost_price ? String(deviceToEdit.cost_price) : '')
            setCashPrice(deviceToEdit.cash_price ? String(deviceToEdit.cash_price) : '')
            setInstallmentPrice(deviceToEdit.installment_price ? String(deviceToEdit.installment_price) : '')
            setStatus(deviceToEdit.status || 'disponivel')
            setImages(Array.isArray(deviceToEdit.images) ? deviceToEdit.images : [])
            setIsRevised(deviceToEdit.technical_passport?.is_revised ?? true)
            setWarrantyMonths(deviceToEdit.technical_passport?.warranty_months || 6)
            setReplacedParts(deviceToEdit.technical_passport?.replaced_parts?.join(', ') || '')
        } else {
            setBrand('Apple')
            setModel('')
            setStorage('128GB')
            setColor('')
            setCondition('seminovo_a')
            setBatteryHealth(90)
            setImei1('')
            setImei2('')
            setSerialNumber('')
            setCostPrice('')
            setCashPrice('')
            setInstallmentPrice('')
            setStatus('disponivel')
            setImages([])
            setIsRevised(true)
            setWarrantyMonths(6)
            setReplacedParts('')
        }
    }, [deviceToEdit, isOpen])

    if (!isOpen) return null

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) {
                toast.error('Selecione um arquivo de imagem válido.')
                return
            }
            const reader = new FileReader()
            reader.onload = (event) => {
                const result = event.target?.result as string
                if (result) {
                    setImages(prev => [...prev, result])
                    toast.success('Foto adicionada ao aparelho!')
                }
            }
            reader.readAsDataURL(file)
        })
    }

    const handlePasteImage = (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items
        if (!items) return

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile()
                if (file) {
                    const reader = new FileReader()
                    reader.onload = (event) => {
                        const result = event.target?.result as string
                        if (result) {
                            setImages(prev => [...prev, result])
                            toast.success('Imagem colada com sucesso!')
                        }
                    }
                    reader.readAsDataURL(file)
                }
            }
        }
    }

    const handleAddImage = () => {
        if (!newImageUrl) return
        if (!newImageUrl.startsWith('http://') && !newImageUrl.startsWith('https://') && !newImageUrl.startsWith('data:image')) {
            toast.error('Informe um link de imagem válido (http:// ou https://)')
            return
        }
        setImages(prev => [...prev, newImageUrl])
        setNewImageUrl('')
        toast.success('Link de foto adicionado!')
    }

    const handleRemoveImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index))
    }

    const handleCashPriceChange = (val: string) => {
        setCashPrice(val)
        const num = parseFloat(val)
        if (!isNaN(num) && !installmentPrice) {
            setInstallmentPrice((num * 1.12).toFixed(2))
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!brand || !model || !cashPrice) {
            toast.error('Marca, Modelo e Preço à Vista são obrigatórios.')
            return
        }

        setIsSaving(true)
        const includedItems = []
        if (box) includedItems.push('Caixa Original')
        if (cable) includedItems.push('Cabo USB-C')
        if (charger) includedItems.push('Fonte de Carregador')
        if (warranty) includedItems.push('Termo de Garantia')

        const partsList = replacedParts.split(',').map(p => p.trim()).filter(Boolean)

        const payload = {
            id: deviceToEdit?.id,
            brand,
            model,
            storage,
            color,
            condition,
            battery_health: Number(batteryHealth),
            imei_1: imei1,
            imei_2: imei2,
            serial_number: serialNumber,
            cost_price: costPrice ? Number(costPrice) : 0,
            cash_price: Number(cashPrice),
            installment_price: installmentPrice ? Number(installmentPrice) : Number(cashPrice) * 1.12,
            status,
            included_items: includedItems,
            images,
            technical_passport: {
                is_revised: isRevised,
                warranty_months: Number(warrantyMonths),
                replaced_parts: partsList
            }
        }

        try {
            const method = deviceToEdit ? 'PUT' : 'POST'
            const res = await fetch('/api/devices', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (res.ok) {
                toast.success(deviceToEdit ? 'Aparelho atualizado!' : 'Aparelho adicionado ao estoque!')
                onSave()
                onClose()
            } else {
                const tempDevice = { ...payload, id: payload.id || 'local_dev_' + Date.now() }
                try {
                    const localRaw = localStorage.getItem('nexus_devices')
                    const localItems = localRaw ? JSON.parse(localRaw) : []
                    localStorage.setItem('nexus_devices', JSON.stringify([tempDevice, ...localItems]))
                    toast.success('Aparelho salvo no estoque!')
                    onSave()
                    onClose()
                } catch (e) {
                    toast.error('Erro ao salvar aparelho.')
                }
            }
        } catch (error) {
            const tempDevice = { ...payload, id: payload.id || 'local_dev_' + Date.now() }
            try {
                const localRaw = localStorage.getItem('nexus_devices')
                const localItems = localRaw ? JSON.parse(localRaw) : []
                localStorage.setItem('nexus_devices', JSON.stringify([tempDevice, ...localItems]))
                toast.success('Aparelho salvo no estoque!')
                onSave()
                onClose()
            } catch (e) {
                toast.error('Erro de conexão.')
            }
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8 max-w-2xl w-full space-y-6 relative my-8 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-border pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20">
                            <Smartphone className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black">{deviceToEdit ? 'Editar Aparelho' : 'Adicionar Aparelho ao Estoque'}</h2>
                            <p className="text-xs text-muted-foreground">Cadastre especificações, fotos, IMEI, preços e passaporte de garantia.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-all">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6" onPaste={handlePasteImage}>
                    {/* Linha 1: Marca, Modelo e Armazenamento */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                            <label className="text-[13px] font-medium text-muted-foreground ml-1">Marca *</label>
                            <select
                                value={brand}
                                onChange={e => setBrand(e.target.value)}
                                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-bold outline-none"
                            >
                                <option value="Apple">Apple</option>
                                <option value="Samsung">Samsung</option>
                                <option value="Xiaomi">Xiaomi</option>
                                <option value="Motorola">Motorola</option>
                                <option value="Outra">Outra Marca</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[13px] font-medium text-muted-foreground ml-1">Modelo *</label>
                            <input
                                type="text"
                                value={model}
                                onChange={e => setModel(e.target.value)}
                                placeholder="Ex: iPhone 13 Pro"
                                required
                                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-bold outline-none"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[13px] font-medium text-muted-foreground ml-1">Capacidade</label>
                            <select
                                value={storage}
                                onChange={e => setStorage(e.target.value)}
                                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-bold outline-none"
                            >
                                <option value="64GB">64GB</option>
                                <option value="128GB">128GB</option>
                                <option value="256GB">256GB</option>
                                <option value="512GB">512GB</option>
                                <option value="1TB">1TB</option>
                            </select>
                        </div>
                    </div>

                    {/* Linha 2: Condição, Cor e Bateria */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                            <label className="text-[13px] font-medium text-muted-foreground ml-1">Condição</label>
                            <select
                                value={condition}
                                onChange={e => setCondition(e.target.value as any)}
                                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-bold outline-none"
                            >
                                <option value="novo_lacrado">Novo Lacrado</option>
                                <option value="seminovo_a">Seminovo A+ (Impecável)</option>
                                <option value="seminovo_b">Seminovo B (Marcas Leves)</option>
                                <option value="recondicionado">Revisado na Loja</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[13px] font-medium text-muted-foreground ml-1">Cor</label>
                            <input
                                type="text"
                                value={color}
                                onChange={e => setColor(e.target.value)}
                                placeholder="Ex: Azul Sierra, Grafite"
                                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-bold outline-none"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[13px] font-medium text-muted-foreground ml-1">Bateria (%)</label>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={batteryHealth}
                                onChange={e => setBatteryHealth(Number(e.target.value))}
                                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-bold outline-none"
                            />
                        </div>
                    </div>

                    {/* SEÇÃO MULTI-MODO DE UPLOAD DE FOTOS */}
                    <div className="p-4 bg-muted/20 border border-border rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                <ImageIcon className="w-4 h-4 text-purple-400" />
                                Fotos do Aparelho (Adicione do Arquivo, Tire Foto ou Cole com Ctrl+V)
                            </span>
                        </div>

                        {/* Painel de Opções de Upload */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {/* 1. Escolher Foto do Arquivo */}
                            <label className="p-3 bg-background border border-border hover:border-purple-500/50 rounded-xl cursor-pointer flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all">
                                <Upload className="w-4 h-4 text-purple-400" />
                                Escolher Foto
                                <input type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />
                            </label>

                            {/* 2. Bater Foto com a Câmera */}
                            <label className="p-3 bg-background border border-border hover:border-emerald-500/50 rounded-xl cursor-pointer flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all">
                                <Camera className="w-4 h-4 text-emerald-400" />
                                Tirar Foto (Câmera)
                                <input type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" />
                            </label>

                            {/* 3. Link da Foto / URL */}
                            <div className="flex items-center gap-1">
                                <input
                                    type="text"
                                    value={newImageUrl}
                                    onChange={e => setNewImageUrl(e.target.value)}
                                    placeholder="Link da imagem..."
                                    className="w-full bg-background border border-border rounded-xl px-2.5 py-2 text-xs font-bold outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddImage}
                                    className="p-2 bg-purple-500/20 text-purple-300 rounded-xl text-xs font-bold hover:bg-purple-500 hover:text-white transition-all"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground font-medium">💡 Dica: Você também pode copiar qualquer imagem e dar <strong>Ctrl+V</strong> nesta tela para colar instantaneamente!</p>

                        {/* Display Thumbnails */}
                        {images.length > 0 && (
                            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/50">
                                {images.map((img, idx) => (
                                    <div key={idx} className="relative w-16 h-16 rounded-xl border border-border overflow-hidden group shadow-md">
                                        <img src={img} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveImage(idx)}
                                            className="absolute top-1 right-1 p-1 bg-black/70 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Identificadores (IMEI 1, IMEI 2 / Serial) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-muted/20 border border-border rounded-2xl">
                        <div className="space-y-1">
                            <label className="text-[13px] font-medium text-muted-foreground ml-1">IMEI 1 (Segurança & Garantia)</label>
                            <input
                                type="text"
                                value={imei1}
                                onChange={e => setImei1(e.target.value)}
                                placeholder="358941029482710"
                                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-mono font-bold outline-none"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[13px] font-medium text-muted-foreground ml-1">IMEI 2 / Serial Number</label>
                            <input
                                type="text"
                                value={serialNumber}
                                onChange={e => setSerialNumber(e.target.value)}
                                placeholder="F2LXD981P0W"
                                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-mono font-bold outline-none"
                            />
                        </div>
                    </div>

                    {/* Preços (Custo, À Vista e 12x) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                            <label className="text-[13px] font-medium text-muted-foreground ml-1">Custo de Compra (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={costPrice}
                                onChange={e => setCostPrice(e.target.value)}
                                placeholder="1800.00"
                                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-bold outline-none"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[13px] font-medium text-emerald-400 ml-1">Preço à Vista (PIX) *</label>
                            <input
                                type="number"
                                step="0.01"
                                value={cashPrice}
                                onChange={e => handleCashPriceChange(e.target.value)}
                                placeholder="2990.00"
                                required
                                className="w-full bg-background border border-emerald-500/50 rounded-xl px-3 py-2.5 text-xs font-bold text-emerald-400 outline-none"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[13px] font-medium text-amber-400 ml-1">Preço Parcelado (12x)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={installmentPrice}
                                onChange={e => setInstallmentPrice(e.target.value)}
                                placeholder="3350.00"
                                className="w-full bg-background border border-amber-500/50 rounded-xl px-3 py-2.5 text-xs font-bold text-amber-300 outline-none"
                            />
                        </div>
                    </div>

                    {/* Passaporte Técnico & Garantia */}
                    <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl space-y-3">
                        <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4" />
                            Passaporte Técnico & Garantia Nexus
                        </span>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-muted-foreground">Meses de Garantia da Loja</label>
                                <select
                                    value={warrantyMonths}
                                    onChange={e => setWarrantyMonths(Number(e.target.value))}
                                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-bold outline-none"
                                >
                                    <option value={3}>3 Meses (Legal)</option>
                                    <option value={6}>6 Meses (Recomendado)</option>
                                    <option value={12}>12 Meses (Estendida)</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-muted-foreground">Peças Trocadas (se houver)</label>
                                <input
                                    type="text"
                                    value={replacedParts}
                                    onChange={e => setReplacedParts(e.target.value)}
                                    placeholder="Ex: Tela OLED Nova, Bateria Homologada"
                                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-bold outline-none"
                                />
                            </div>
                        </div>

                        {/* Checkboxes */}
                        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-primary/20 text-xs">
                            <label className="flex items-center gap-2 cursor-pointer font-bold">
                                <input type="checkbox" checked={box} onChange={e => setBox(e.target.checked)} className="rounded" />
                                Caixa Original
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer font-bold">
                                <input type="checkbox" checked={cable} onChange={e => setCable(e.target.checked)} className="rounded" />
                                Cabo USB-C
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer font-bold">
                                <input type="checkbox" checked={charger} onChange={e => setCharger(e.target.checked)} className="rounded" />
                                Carregador
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer font-bold">
                                <input type="checkbox" checked={warranty} onChange={e => setWarranty(e.target.checked)} className="rounded" />
                                Termo de Garantia
                            </label>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted">
                            Cancelar
                        </button>
                        <button
 type="submit"
 disabled={isSaving}
 className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50"
 >
                            {isSaving ? 'Salvando...' : deviceToEdit ? 'Atualizar Aparelho' : 'Salvar no Estoque'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
