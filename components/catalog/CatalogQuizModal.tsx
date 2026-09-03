'use client'

import { useState } from 'react'
import { 
    X, Sparkles, CheckCircle2, ArrowRight, ArrowLeft, Smartphone, 
    ShieldCheck, MessageSquare, Flame, Trophy, Zap, Gamepad2, Award, Info
} from 'lucide-react'
import { Device } from '@/types/devices'
import { DEFAULT_TRADE_IN_ITEMS, TradeInModelItem } from '@/lib/trade-in-defaults'
import { formatCurrency, cn } from '@/lib/utils'

interface CatalogQuizModalProps {
    isOpen: boolean
    onClose: () => void
    devices: Device[]
    companyName: string
    companyPhone: string
    tradeInValues?: TradeInModelItem[]
    themePrimary?: string
    installmentRate12x?: number
    installmentRate24x?: number
}

export default function CatalogQuizModal({
    isOpen,
    onClose,
    devices,
    companyName,
    companyPhone,
    tradeInValues = DEFAULT_TRADE_IN_ITEMS,
    themePrimary = '#10B981',
    installmentRate12x = 10,
    installmentRate24x = 18
}: CatalogQuizModalProps) {
    // 2-Step Quiz (Fase 1: Troca / Usado | Fase 2: Orçamento | Fase 3: Vitória Match)
    const [step, setStep] = useState<1 | 2 | 3>(1)

    // User Choices
    const [hasTradeIn, setHasTradeIn] = useState<boolean | null>(null)
    const [selectedTradeIn, setSelectedTradeIn] = useState<TradeInModelItem | null>(null)
    const [selectedBudget, setSelectedBudget] = useState<string | null>(null)

    if (!isOpen) return null

    const budgets = [
        { 
            id: 'ate150', 
            title: 'Nível 1 • Econômico', 
            monthly: 'Até R$ 150/mês', 
            desc: 'Ou até R$ 1.800 à vista (Ótimo custo-benefício)',
            badge: '⚡ Entrada Acessível'
        },
        { 
            id: 'ate300', 
            title: 'Nível 2 • Intermediário Pro', 
            monthly: 'R$ 150 a R$ 300/mês', 
            desc: 'Ou R$ 1.800 a R$ 3.500 à vista (Câmeras Pro & Bateria)',
            badge: '🔥 Mais Vendido'
        },
        { 
            id: 'acima300', 
            title: 'Nível 3 • Ultra Performance', 
            monthly: 'Acima de R$ 300/mês', 
            desc: 'Topo de Linha Lacrado/Seminovo (Pro Max & Titanium)',
            badge: '👑 Performance Gamer'
        }
    ]

    // Find Best Matched Device from Store Inventory
    const getMatchedDevice = () => {
        if (!devices || devices.length === 0) return null

        let filtered = [...devices]

        if (selectedBudget === 'ate150') {
            filtered = filtered.filter(d => d.cash_price <= 1800)
        } else if (selectedBudget === 'ate300') {
            filtered = filtered.filter(d => d.cash_price > 1800 && d.cash_price <= 3500)
        } else if (selectedBudget === 'acima300') {
            filtered = filtered.filter(d => d.cash_price > 3500)
        }

        if (filtered.length === 0) filtered = devices

        const pro = filtered.find(d => d.model.toLowerCase().includes('pro'))
        return pro || filtered[0]
    }

    const matchedDevice = getMatchedDevice()

    const tradeInDiscount = (hasTradeIn && selectedTradeIn) ? selectedTradeIn.estimated_value : 0
    const rawCashPrice = matchedDevice ? matchedDevice.cash_price : 0
    const finalCashPrice = Math.max(0, rawCashPrice - tradeInDiscount)

    const finalMonthly12x = (finalCashPrice * (1 + installmentRate12x / 100)) / 12
    const finalMonthly24x = (finalCashPrice * (1 + installmentRate24x / 100)) / 24

    const sendWhatsAppOffer = () => {
        if (!companyPhone || !matchedDevice) return
        const cleanPhone = companyPhone.replace(/\D/g, '')

        let msg = `🎮 *OFERTA CONQUISTADA NO QUIZ GAMIFICADO*\n\n`
        msg += `🏆 *Aparelho Selecionado:* ${matchedDevice.brand} ${matchedDevice.model} (${matchedDevice.storage || ''})\n`
        msg += `💰 *Preço à Vista:* ${formatCurrency(matchedDevice.cash_price)}\n`

        if (hasTradeIn && selectedTradeIn) {
            msg += `\n📱 *Celular de Entrada:* ${selectedTradeIn.model} ${selectedTradeIn.storage}\n`
            msg += `🟢 *Estimativa de Abate:* -${formatCurrency(selectedTradeIn.estimated_value)}\n`
            msg += `🔥 *SALDO À VISTA (PIX):* ${formatCurrency(finalCashPrice)}\n`
        } else {
            msg += `🔥 *VALOR À VISTA (PIX):* ${formatCurrency(finalCashPrice)}\n`
        }

        msg += `💳 *PARCELADO EM 12X DE:* ${formatCurrency(finalMonthly12x)}/mês\n`
        msg += `💳 *PARCELADO EM 24X DE:* ${formatCurrency(finalMonthly24x)}/mês\n`
        msg += `\n*Gostaria de garantir este aparelho no meu atendimento!*`

        window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank')
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 overflow-hidden">
            <div className="bg-[#0D111A] border-2 border-slate-800 rounded-3xl p-4 sm:p-6 max-w-2xl w-full max-h-[92vh] flex flex-col justify-between relative shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-200">
                
                {/* GAMING HUD HEADER */}
                <div className="shrink-0 space-y-3 pb-3 border-b border-slate-800/80">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-md" style={{ color: themePrimary, borderColor: `${themePrimary}40` }}>
                                <Gamepad2 className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">NEXUS GAME HUD</span>
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-400">
                                {step === 3 ? '🏆 FASE FINAL' : `FASE ${step} DE 2`}
                            </span>
                        </div>

                        <button 
                            onClick={onClose}
                            className="p-1.5 hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Progress XP Bar */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                            <span>Progresso do Jogador</span>
                            <span>{step === 1 ? '50% XP' : step === 2 ? '85% XP' : '100% MATCH UNLOCKED'}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                            <div 
                                className="h-full transition-all duration-500 rounded-full" 
                                style={{ 
                                    width: step === 1 ? '50%' : step === 2 ? '85%' : '100%',
                                    backgroundColor: themePrimary,
                                    boxShadow: `0 0 12px ${themePrimary}`
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* GAME BODY - STEP 1 (EQUIPAMENTO DE ENTRADA / TROCA) */}
                {step === 1 && (
                    <div className="flex-1 min-h-0 flex flex-col justify-between py-3 space-y-3">
                        <div className="space-y-1 text-center sm:text-left">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20" style={{ color: themePrimary }}>
                                ETAPA 1 DE 2 • INVENTÁRIO
                            </span>
                            <h3 className="text-lg sm:text-xl font-black text-white">Você tem um celular para dar na troca? 🔁</h3>
                            <p className="text-xs text-slate-400">Dando seu usado de entrada, você economiza e só paga a diferença!</p>
                        </div>

                        {/* Choice Cards */}
                        <div className="grid grid-cols-2 gap-3 shrink-0">
                            <button
                                onClick={() => setHasTradeIn(true)}
                                className={cn(
                                    "p-3 rounded-2xl border-2 text-left transition-all flex items-center gap-3",
                                    hasTradeIn === true ? "bg-slate-900 border-emerald-400" : "bg-[#111622] border-slate-800 hover:border-slate-700"
                                )}
                                style={hasTradeIn === true ? { borderColor: themePrimary } : {}}
                            >
                                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0" style={{ color: themePrimary }}>
                                    <Smartphone className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-black text-xs text-white">Sim, quero dar troca</h4>
                                    <p className="text-[10px] text-slate-400 truncate">Abater valor do meu usado</p>
                                </div>
                            </button>

                            <button
                                onClick={() => {
                                    setHasTradeIn(false)
                                    setSelectedTradeIn(null)
                                }}
                                className={cn(
                                    "p-3 rounded-2xl border-2 text-left transition-all flex items-center gap-3",
                                    hasTradeIn === false ? "bg-slate-900 border-emerald-400" : "bg-[#111622] border-slate-800 hover:border-slate-700"
                                )}
                                style={hasTradeIn === false ? { borderColor: themePrimary } : {}}
                            >
                                <div className="p-2.5 bg-slate-800 text-slate-400 rounded-xl shrink-0">
                                    <X className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-black text-xs text-white">Não tenho troca</h4>
                                    <p className="text-[10px] text-slate-400 truncate">Comprar direto sem entrada</p>
                                </div>
                            </button>
                        </div>

                        {/* Trade in selector grid if YES */}
                        {hasTradeIn && (
                            <div className="flex-1 min-h-0 space-y-1.5 flex flex-col justify-between">
                                <label className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block" style={{ color: themePrimary }}>
                                    Selecione seu modelo atual para abate imediato:
                                </label>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-40 sm:max-h-48 overflow-y-auto p-1.5 border border-slate-800 rounded-2xl bg-[#0A0D14] shrink-0">
                                    {tradeInValues.map(item => {
                                        const isSel = selectedTradeIn?.id === item.id
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => setSelectedTradeIn(item)}
                                                className={cn(
                                                    "p-2 rounded-xl border text-left flex items-center gap-2 transition-all",
                                                    isSel ? "bg-slate-800 border-emerald-400 scale-[1.02]" : "bg-[#111622] border-slate-800/80 hover:border-slate-700"
                                                )}
                                                style={isSel ? { borderColor: themePrimary } : {}}
                                            >
                                                <div className="w-8 h-8 rounded-lg overflow-hidden bg-black shrink-0 border border-slate-800">
                                                    <img src={item.image_url} alt={item.model} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-[11px] text-white truncate">{item.model}</p>
                                                    <p className="text-[9px] font-black text-emerald-400">- {formatCurrency(item.estimated_value)}</p>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>

                                <p className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold pt-1">
                                    <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    <span>*Estimativa aproximada sujeita à avaliação presencial do estado do aparelho na loja.</span>
                                </p>
                            </div>
                        )}

                        {/* Next Button */}
                        <div className="flex items-center justify-end pt-2 border-t border-slate-800/80">
                            <button
                                disabled={hasTradeIn === null || (hasTradeIn && !selectedTradeIn)}
                                onClick={() => setStep(2)}
                                className="px-6 py-2.5 text-black font-black rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
                                style={{ backgroundColor: themePrimary }}
                            >
                                Avançar para Etapa 2
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* GAME BODY - STEP 2 (FAIXA DE ORÇAMENTO / PARCELA MENSAL) */}
                {step === 2 && (
                    <div className="flex-1 min-h-0 flex flex-col justify-between py-3 space-y-3">
                        <div className="space-y-1 text-center sm:text-left">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20" style={{ color: themePrimary }}>
                                ETAPA 2 DE 2 • PLANO DE CONQUISTA
                            </span>
                            <h3 className="text-lg sm:text-xl font-black text-white">Qual parcela mensal se encaixa melhor para você? 💳</h3>
                            <p className="text-xs text-slate-400">Escolha o nível de investimento desejado para ajustarmos o match ideal.</p>
                        </div>

                        {/* Level Select Cards */}
                        <div className="space-y-2.5 flex-1 min-h-0 justify-center flex flex-col">
                            {budgets.map(b => {
                                const isSel = selectedBudget === b.id
                                return (
                                    <button
                                        key={b.id}
                                        onClick={() => setSelectedBudget(b.id)}
                                        className={cn(
                                            "p-3.5 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-3",
                                            isSel ? "bg-slate-900 border-emerald-400 shadow-lg" : "bg-[#111622] border-slate-800 hover:border-slate-700"
                                        )}
                                        style={isSel ? { borderColor: themePrimary } : {}}
                                    >
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black text-white">{b.title}</span>
                                                <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                                    {b.badge}
                                                </span>
                                            </div>
                                            <p className="text-xs font-black text-emerald-400" style={{ color: themePrimary }}>{b.monthly}</p>
                                            <p className="text-[10px] text-slate-400">{b.desc}</p>
                                        </div>

                                        <div className={cn(
                                            "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0",
                                            isSel ? "border-emerald-400 bg-emerald-400 text-black" : "border-slate-700"
                                        )}>
                                            {isSel && <CheckCircle2 className="w-4 h-4 fill-current" />}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                            <button
                                onClick={() => setStep(1)}
                                className="px-4 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5 hover:bg-slate-700"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Voltar
                            </button>

                            <button
                                disabled={!selectedBudget}
                                onClick={() => setStep(3)}
                                className="px-6 py-2.5 text-black font-black rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg animate-pulse"
                                style={{ backgroundColor: themePrimary }}
                            >
                                Desbloquear Match Final
                                <Trophy className="w-4 h-4 fill-current" />
                            </button>
                        </div>
                    </div>
                )}

                {/* GAME BODY - STEP 3 (VICTORY MATCH UNLOCKED) */}
                {step === 3 && (
                    <div className="flex-1 min-h-0 flex flex-col justify-between py-2 space-y-3">
                        <div className="text-center space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-0.5 rounded-full inline-flex items-center gap-1" style={{ color: themePrimary }}>
                                <Trophy className="w-3.5 h-3.5 fill-current" />
                                CONQUISTA DESBLOQUEADA • MATCH LEGENDÁRIO
                            </span>
                            <h3 className="text-xl sm:text-2xl font-black text-white">Seu Celular Ideal foi Selecionado! 🎯</h3>
                        </div>

                        {matchedDevice && (
                            <div className="bg-[#0A0D14] border border-slate-800 rounded-2xl p-4 space-y-3 shadow-2xl relative overflow-hidden">
                                <div className="flex items-center gap-4">
                                    <div className="w-24 h-24 bg-black rounded-xl overflow-hidden border border-slate-800 shrink-0 p-1">
                                        <img 
                                            src={Array.isArray(matchedDevice.images) && matchedDevice.images.length > 0 ? matchedDevice.images[0] : 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&auto=format&fit=crop&q=80'} 
                                            alt={matchedDevice.model} 
                                            className="w-full h-full object-contain"
                                        />
                                    </div>

                                    <div className="space-y-1 flex-1 min-w-0">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                                            {matchedDevice.brand} • {matchedDevice.storage || 'Estoque'}
                                        </span>
                                        <h4 className="text-base font-black text-white truncate">{matchedDevice.model}</h4>
                                        <p className="text-xs text-slate-400">
                                            {matchedDevice.color ? `Cor: ${matchedDevice.color} • ` : ''}
                                            {matchedDevice.condition === 'novo_lacrado' ? 'Novo Lacrado' : `Seminovo (${matchedDevice.battery_health}% Bateria)`}
                                        </p>
                                        <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 pt-0.5" style={{ color: themePrimary }}>
                                            <ShieldCheck className="w-3.5 h-3.5" />
                                            <span>Garantia de Loja Inclusa</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Calculation Breakdown Box */}
                                <div className="p-3 bg-[#111622] border border-slate-800 rounded-xl space-y-2 text-xs">
                                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                                        <span>Preço de Tabela:</span>
                                        <span className="font-bold text-slate-200">{formatCurrency(matchedDevice.cash_price)}</span>
                                    </div>

                                    {hasTradeIn && selectedTradeIn && (
                                        <div className="flex items-center justify-between text-emerald-400 text-[11px] font-bold border-t border-slate-800/80 pt-1">
                                            <span className="flex items-center gap-1">
                                                <Flame className="w-3.5 h-3.5 fill-current" />
                                                Abate estimado ({selectedTradeIn.model}):
                                            </span>
                                            <span>- {formatCurrency(tradeInDiscount)}</span>
                                        </div>
                                    )}

                                    <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                        <div>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                {hasTradeIn ? 'SALDO À VISTA (PIX):' : 'VALOR À VISTA (PIX):'}
                                            </span>
                                            <p className="text-xl sm:text-2xl font-black text-emerald-400" style={{ color: themePrimary }}>{formatCurrency(finalCashPrice)}</p>
                                        </div>

                                        <div className="text-left sm:text-right space-y-0.5">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">PARCELADO NO CARTÃO:</span>
                                            <p className="text-xs font-bold text-slate-200">12x de {formatCurrency(finalMonthly12x)}</p>
                                            <p className="text-xs font-bold text-amber-300">24x de {formatCurrency(finalMonthly24x)}</p>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-[9px] text-slate-400 text-center font-medium">
                                    *Aviso: O valor pago em aparelhos de entrada é uma estimativa aproximada sujeita à avaliação presencial na loja.
                                </p>
                            </div>
                        )}

                        {/* CTA Button */}
                        <div className="space-y-2 pt-1 border-t border-slate-800/80">
                            <button
                                onClick={sendWhatsAppOffer}
                                className="w-full py-3.5 text-black font-black rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl hover:scale-[1.01] active:scale-95 animate-pulse"
                                style={{ backgroundColor: themePrimary }}
                            >
                                <MessageSquare className="w-4 h-4 fill-current" />
                                RESGATAR MEU CELULAR NO WHATSAPP AGORA 🎮
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
