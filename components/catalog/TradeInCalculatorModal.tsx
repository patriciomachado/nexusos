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
    installmentRate12x?: number
    installmentRate24x?: number
}

export default function TradeInCalculatorModal({
    isOpen,
    onClose,
    targetDevice,
    companyPhone,
    tradeInValues = DEFAULT_TRADE_IN_ITEMS,
    themePrimary = '#10B981',
    installmentRate12x = 10,
    installmentRate24x = 18
}: TradeInCalculatorModalProps) {
    const [selectedTradeIn, setSelectedTradeIn] = useState<TradeInModelItem | null>(tradeInValues[3] || null) // default iPhone 11

    if (!isOpen || !targetDevice) return null

    const tradeInValue = selectedTradeIn ? selectedTradeIn.estimated_value : 0
    const remainingCash = Math.max(0, targetDevice.cash_price - tradeInValue)
    
    // Automatic 12x and 24x calculation with custom interest rates
    const remainingTotal12x = remainingCash * (1 + installmentRate12x / 100)
    const remainingMonthly12x = remainingTotal12x / 12

    const remainingTotal24x = remainingCash * (1 + installmentRate24x / 100)
    const remainingMonthly24x = remainingTotal24x / 24

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
            text += `💳 *OU EM 12X DE:* ${formatCurrency(remainingMonthly12x)}/mês\n`
            text += `💳 *OU EM 24X DE:* ${formatCurrency(remainingMonthly24x)}/mês\n`
        }

        text += `\n*Gostaria de agendar a troca deste aparelho com a loja!*`

        window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank')
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#111622] border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-5 relative my-8 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
                            <Smartphone className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-black text-base text-white">Simulador de Troca & Upgrade</h3>
                            <p className="text-xs text-slate-400">Calcule a diferença a pagar dando seu usado</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl transition">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Target Device Header */}
                <div className="p-4 bg-[#0A0D14] border border-slate-800 rounded-2xl flex items-center gap-4">
                    <div className="w-16 h-16 bg-black rounded-xl overflow-hidden shrink-0 border border-slate-800 p-1">
                        <img
                            src={Array.isArray(targetDevice.images) && targetDevice.images.length > 0 ? targetDevice.images[0] : 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=300&auto=format&fit=crop&q=80'}
                            alt={targetDevice.model}
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <div>
                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                            Aparelho Desejado
                        </span>
                        <h4 className="font-black text-sm text-white mt-1">{targetDevice.brand} {targetDevice.model} ({targetDevice.storage || 'Estoque'})</h4>
                        <p className="text-xs font-black text-emerald-400">{formatCurrency(targetDevice.cash_price)} à vista</p>
                    </div>
                </div>

                {/* Trade-In Selection Grid */}
                <div className="space-y-3">
                    <label className="text-[13px] font-medium text-slate-300 block">
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
                                        "p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition",
                                        isSel ? "bg-slate-800 border-emerald-400" : "bg-[#111622] border-slate-800/80 hover:border-slate-700"
                                    )}
                                    style={isSel ? { borderColor: themePrimary } : {}}
                                >
                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-black shrink-0 border border-slate-800">
                                        <img src={item.image_url} alt={item.model} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-xs text-white truncate">{item.model}</p>
                                        <span className="text-[11px] text-slate-400">{item.storage}</span>
                                        <p className="text-[11px] font-black text-emerald-400">Abate: {formatCurrency(item.estimated_value)}</p>
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

                        <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div>
                                <span className="text-[11px] font-black uppercase text-slate-400 tracking-widest">VOCÊ SÓ PAGA A DIFERENÇA (PIX):</span>
                                <p className="text-2xl font-black text-emerald-400">{formatCurrency(remainingCash)}</p>
                            </div>

                            <div className="text-left sm:text-right space-y-0.5">
                                <span className="text-[11px] font-black uppercase text-slate-400 tracking-widest block">PARCELADO NO CARTÃO:</span>
                                <p className="text-xs font-bold text-slate-200">12x de {formatCurrency(remainingMonthly12x)}</p>
                                <p className="text-xs font-bold text-amber-300">24x de {formatCurrency(remainingMonthly24x)}</p>
                            </div>
                        </div>

                        <p className="text-[11px] text-slate-400 text-center font-medium pt-1 border-t border-slate-800/80">
                            *Aviso: O valor do seu celular de entrada é uma estimativa aproximada sujeita à avaliação física presencial em nossa loja.
                        </p>
                    </div>
                )}

                {/* Action Button */}
                <button
 onClick={sendWhatsAppProposal}
 className="w-full py-3.5 text-black font-black rounded-2xl text-xs transition flex items-center justify-center gap-2 shadow-xl hover:scale-[1.02]"
 style={{ backgroundColor: themePrimary }}
 >
                    <MessageSquare className="w-4 h-4 fill-current" />
                    Enviar Proposta de Troca no WhatsApp 📲
                </button>
            </div>
        </div>
    )
}
