'use client'

import { useState } from 'react'
import { X, Smartphone, ArrowRight, MessageSquare, CheckCircle2, Flame, ShieldCheck } from 'lucide-react'
import { Device } from '@/types/devices'
import { DEFAULT_TRADE_IN_ITEMS, TradeInModelItem } from '@/lib/trade-in-defaults'
import { formatCurrency, cn } from '@/lib/utils'

interface TradeInCalculatorModalProps {
    isOpen: boolean
    onClose: () => void
    targetDevice: Device | null
    companyPhone: string
    tradeInValues?: TradeInModelItem[]
    themePrimary?: string
}

export default function TradeInCalculatorModal({
    isOpen,
    onClose,
    targetDevice,
    companyPhone,
    tradeInValues = DEFAULT_TRADE_IN_ITEMS,
    themePrimary = '#10B981'
}: TradeInCalculatorModalProps) {
    const [selectedTradeIn, setSelectedTradeIn] = useState<TradeInModelItem | null>(tradeInValues[3] || null) // default iPhone 11

    if (!isOpen || !targetDevice) return null

    const tradeInValue = selectedTradeIn ? selectedTradeIn.estimated_value : 0
    const remainingCash = Math.max(0, targetDevice.cash_price - tradeInValue)
    const targetInstallment = targetDevice.installment_price || targetDevice.cash_price * 1.12
    const remainingInstallment = Math.max(0, targetInstallment - tradeInValue)

    const sendWhatsAppProposal = () => {
        if (!companyPhone) return
        const cleanPhone = companyPhone.replace(/\D/g, '')

        let text = `🔁 *PROPOSTA DE TROCA (UPGRADE DE CELULAR)*\n\n`
        text += `🎯 *Aparelho Desejado:* ${targetDevice.brand} ${targetDevice.model} (${targetDevice.storage || ''})\n`
        text += `💰 *Preço à Vista:* ${formatCurrency(targetDevice.cash_price)}\n\n`

        if (selectedTradeIn) {
            text += `📱 *Meu Celular na Troca:* ${selectedTradeIn.model} ${selectedTradeIn.storage}\n`
            text += `🟢 *Avaliação Estimada:* ${formatCurrency(selectedTradeIn.estimated_value)}\n`
            text += `🔥 *SALDO RESTANTE À VISTA:* ${formatCurrency(remainingCash)}\n`
            text += `💳 *OU EM 12X DE:* ${formatCurrency(remainingInstallment / 12)}/mês\n`
        }

        text += `\n*Gostaria de agendar a troca deste aparelho com a loja!*`

        window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank')
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#111622] border border-slate-800 rounded-3xl p-6 md:p-8 max-w-xl w-full space-y-6 relative my-8 shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl text-black font-black text-xs flex items-center gap-1 shadow-lg" style={{ backgroundColor: themePrimary }}>
                            <Smartphone className="w-4 h-4 fill-current" />
                            UPGRADE
                        </div>
                        <span className="text-xs text-slate-300 font-bold">Calculadora de Troca Instantânea</span>
                    </div>

                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Target Device Overview */}
                <div className="p-4 bg-[#0A0D14] border border-slate-800 rounded-2xl flex items-center gap-4">
                    <div className="w-16 h-16 bg-black rounded-xl overflow-hidden border border-slate-800 shrink-0 p-1">
                        <img 
                            src={Array.isArray(targetDevice.images) && targetDevice.images.length > 0 ? targetDevice.images[0] : 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=300&auto=format&fit=crop&q=80'} 
                            alt={targetDevice.model}
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <div>
                        <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                            Aparelho que você quer levar
                        </span>
                        <h4 className="font-black text-base text-white mt-1">{targetDevice.brand} {targetDevice.model} ({targetDevice.storage})</h4>
                        <p className="text-xs font-bold text-emerald-400">{formatCurrency(targetDevice.cash_price)} à vista</p>
                    </div>
                </div>

                {/* Trade-In Selection Grid */}
                <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-300 block">
                        Selecione o seu celular atual para dar como entrada:
                    </label>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1.5 border border-slate-800 rounded-2xl bg-[#0A0D14]">
                        {tradeInValues.map(item => {
                            const isSel = selectedTradeIn?.id === item.id
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setSelectedTradeIn(item)}
                                    className={cn(
                                        "p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all",
                                        isSel ? "bg-slate-800 border-emerald-400" : "bg-[#111622] border-slate-800/80 hover:border-slate-700"
                                    )}
                                    style={isSel ? { borderColor: themePrimary } : {}}
                                >
                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-black shrink-0 border border-slate-800">
                                        <img src={item.image_url} alt={item.model} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-xs text-white truncate">{item.model}</p>
                                        <span className="text-[10px] text-slate-400">{item.storage}</span>
                                        <p className="text-[10px] font-black text-emerald-400">Abate: {formatCurrency(item.estimated_value)}</p>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Result Calculation Box */}
                {selectedTradeIn && (
                    <div className="p-4 bg-[#0A0D14] border border-slate-800 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between text-xs text-emerald-400 font-bold">
                            <span className="flex items-center gap-1">
                                <Flame className="w-4 h-4 fill-current" />
                                Avaliação do seu {selectedTradeIn.model} ({selectedTradeIn.storage}):
                            </span>
                            <span className="text-sm font-black">{formatCurrency(tradeInValue)}</span>
                        </div>

                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                            <div>
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">VOCÊ SÓ PAGA A DIFERENÇA (PIX):</span>
                                <p className="text-2xl font-black text-emerald-400">{formatCurrency(remainingCash)}</p>
                            </div>

                            <div className="text-right">
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">PARCELADO NO CARTÃO:</span>
                                <p className="text-xs font-bold text-amber-300">12x de {formatCurrency(remainingInstallment / 12)}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Button */}
                <button
                    onClick={sendWhatsAppProposal}
                    className="w-full py-3.5 text-black font-black rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl hover:scale-[1.02]"
                    style={{ backgroundColor: themePrimary }}
                >
                    <MessageSquare className="w-4 h-4 fill-current" />
                    Enviar Proposta de Troca no WhatsApp 📲
                </button>
            </div>
        </div>
    )
}
