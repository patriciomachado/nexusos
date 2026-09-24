'use client'

import { useState } from 'react'
import { X, RefreshCw, Calculator, FileText, CheckCircle2, AlertTriangle, ShieldCheck, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

interface TradeInModalProps {
    isOpen: boolean
    onClose: () => void
    onSaveSuccess: () => void
}

export default function TradeInModal({ isOpen, onClose, onSaveSuccess }: TradeInModalProps) {
    const [customerName, setCustomerName] = useState('')
    const [customerCpf, setCustomerCpf] = useState('')
    const [customerPhone, setCustomerPhone] = useState('')
    const [deviceModel, setDeviceModel] = useState('')
    const [imei, setImei] = useState('')
    const [marketValue, setMarketValue] = useState('')

    // Inspection Checklist
    const [screenOk, setScreenOk] = useState(true)
    const [touchOk, setTouchOk] = useState(true)
    const [batteryPercent, setBatteryPercent] = useState(85)
    const [camerasOk, setCamerasOk] = useState(true)
    const [faceIdOk, setFaceIdOk] = useState(true)
    const [housingCondition, setHousingCondition] = useState<'impecavel' | 'bom' | 'marcas_leves' | 'danificado'>('bom')

    const [estimatedRepairCost, setEstimatedRepairCost] = useState('0')
    const [isSubmitting, setIsSubmitting] = useState(false)

    if (!isOpen) return null

    // Calculate suggested valuation offer
    const mValue = parseFloat(marketValue) || 0
    const repairCost = parseFloat(estimatedRepairCost) || 0
    let penaltyPercent = 0

    if (!screenOk) penaltyPercent += 30
    if (!touchOk) penaltyPercent += 15
    if (batteryPercent < 80) penaltyPercent += 10
    if (!camerasOk) penaltyPercent += 15
    if (!faceIdOk) penaltyPercent += 20
    if (housingCondition === 'danificado') penaltyPercent += 15

    const baseValuation = Math.max(0, mValue * (1 - penaltyPercent / 100) - repairCost)
    const suggestedOffer = Math.max(0, baseValuation * 0.75) // 25% profit margin for resale

    const handleSubmit = async () => {
        if (!customerName || !deviceModel) {
            toast.error('Nome do cliente e Modelo do aparelho são obrigatórios.')
            return
        }

        setIsSubmitting(true)
        try {
            const res = await fetch('/api/devices/trade-in', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_name: customerName,
                    customer_cpf: customerCpf,
                    customer_phone: customerPhone,
                    device_model: deviceModel,
                    imei,
                    assessment_checklist: {
                        screen_ok: screenOk,
                        touch_ok: touchOk,
                        battery_health: batteryPercent,
                        cameras_ok: camerasOk,
                        face_id_ok: faceIdOk,
                        housing_condition: housingCondition,
                        estimated_repair_cost: repairCost
                    },
                    offered_price: suggestedOffer,
                    status: 'avaliado'
                })
            })

            if (res.ok) {
                toast.success('Avaliação de Trade-In registrada!')
                onSaveSuccess()
                onClose()
            } else {
                toast.error('Erro ao salvar avaliação.')
            }
        } catch (error) {
            toast.error('Erro de conexão.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-card border border-border rounded-3xl p-6 md:p-8 max-w-2xl w-full space-y-6 shadow-2xl relative my-8 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-border pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400 border border-amber-500/20">
                            <Calculator className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black">Calculadora de Avaliação & Trade-In</h2>
                            <p className="text-xs text-muted-foreground">Avalie o celular seminovo do cliente para compra ou abate na troca.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-all">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                <div className="space-y-5">
                    {/* Dados do Cliente e Aparelho */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[13px] font-medium text-muted-foreground ml-1">Nome do Cliente *</label>
                            <input
                                type="text"
                                value={customerName}
                                onChange={e => setCustomerName(e.target.value)}
                                placeholder="João Silva"
                                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-bold outline-none"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[13px] font-medium text-muted-foreground ml-1">Telefone / WhatsApp</label>
                            <input
                                type="text"
                                value={customerPhone}
                                onChange={e => setCustomerPhone(e.target.value)}
                                placeholder="(48) 99999-8888"
                                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-bold outline-none"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[13px] font-medium text-muted-foreground ml-1">Modelo do Usado *</label>
                            <input
                                type="text"
                                value={deviceModel}
                                onChange={e => setDeviceModel(e.target.value)}
                                placeholder="Ex: iPhone 11 128GB"
                                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-bold outline-none"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[13px] font-medium text-muted-foreground ml-1">IMEI do Aparelho</label>
                            <input
                                type="text"
                                value={imei}
                                onChange={e => setImei(e.target.value)}
                                placeholder="358491029849201"
                                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-mono font-bold outline-none"
                            />
                        </div>
                    </div>

                    {/* Checklist de Testes Físicos */}
                    <div className="p-4 bg-muted/30 border border-border rounded-2xl space-y-3">
                        <span className="text-[11px] font-black uppercase text-muted-foreground tracking-widest">Checklist Técnico de Inspeção</span>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                            <label className="flex items-center gap-2 cursor-pointer font-bold bg-background p-2.5 rounded-xl border border-border">
                                <input type="checkbox" checked={screenOk} onChange={e => setScreenOk(e.target.checked)} className="rounded" />
                                Tela sem Trincos
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer font-bold bg-background p-2.5 rounded-xl border border-border">
                                <input type="checkbox" checked={touchOk} onChange={e => setTouchOk(e.target.checked)} className="rounded" />
                                Touch 100% OK
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer font-bold bg-background p-2.5 rounded-xl border border-border">
                                <input type="checkbox" checked={camerasOk} onChange={e => setCamerasOk(e.target.checked)} className="rounded" />
                                Câmeras OK
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer font-bold bg-background p-2.5 rounded-xl border border-border">
                                <input type="checkbox" checked={faceIdOk} onChange={e => setFaceIdOk(e.target.checked)} className="rounded" />
                                Face ID / Biometria
                            </label>

                            <div className="bg-background p-2 rounded-xl border border-border flex items-center justify-between">
                                <span className="text-[11px] font-bold">Bateria:</span>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={batteryPercent}
                                    onChange={e => setBatteryPercent(Number(e.target.value))}
                                    className="w-14 bg-muted border border-border rounded px-1 text-center font-bold"
                                />
                                <span className="text-[11px] font-bold">%</span>
                            </div>

                            <div className="bg-background p-2 rounded-xl border border-border flex items-center justify-between">
                                <span className="text-[11px] font-bold">Carcaça:</span>
                                <select
                                    value={housingCondition}
                                    onChange={e => setHousingCondition(e.target.value as any)}
                                    className="bg-muted border border-border rounded text-[11px] font-bold"
                                >
                                    <option value="impecavel">Impecável</option>
                                    <option value="bom">Bom Estado</option>
                                    <option value="marcas_leves">Marcas Leves</option>
                                    <option value="danificado">Marcas Fortes</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Valores de Mercado e Custo de Reforma */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[13px] font-medium text-muted-foreground ml-1">Preço de Mercado Usado (R$)</label>
                            <input
                                type="number"
                                value={marketValue}
                                onChange={e => setMarketValue(e.target.value)}
                                placeholder="Ex: 2200.00"
                                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-bold outline-none"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[13px] font-medium text-muted-foreground ml-1">Custo Estimado de Peças (R$)</label>
                            <input
                                type="number"
                                value={estimatedRepairCost}
                                onChange={e => setEstimatedRepairCost(e.target.value)}
                                placeholder="Ex: 150.00"
                                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-bold outline-none"
                            />
                        </div>
                    </div>

                    {/* Resultado da Sugestão da Avaliação */}
                    <div className="p-5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <span className="text-[11px] font-black uppercase text-amber-400 tracking-widest">Valor Sugerido para Pagamento/Abate</span>
                            <h3 className="text-2xl font-black text-amber-300 tracking-tight">
                                {formatCurrency(suggestedOffer)}
                            </h3>
                            <p className="text-[11px] text-muted-foreground">Margem de segurança da loja calculada com base no desgaste e reparos.</p>
                        </div>

                        <button
 onClick={handleSubmit}
 disabled={isSubmitting}
 className="w-full md:w-auto px-6 py-3 bg-amber-500 text-black rounded-2xl text-xs font-black hover:bg-amber-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-amber-500/20"
 >
                            <CheckCircle2 className="w-4 h-4" />
                            Registrar Avaliação
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
