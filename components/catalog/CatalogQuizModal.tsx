'use client'

import { useState } from 'react'
import { 
    X, Sparkles, CheckCircle2, ArrowRight, ArrowLeft, Smartphone, 
    Camera, BatteryCharging, Gamepad2, PiggyBank, ShieldCheck, MessageSquare, Flame 
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
}

export default function CatalogQuizModal({
    isOpen,
    onClose,
    devices,
    companyName,
    companyPhone,
    tradeInValues = DEFAULT_TRADE_IN_ITEMS,
    themePrimary = '#10B981'
}: CatalogQuizModalProps) {
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

    // User Choices
    const [selectedObjective, setSelectedObjective] = useState<string | null>(null)
    const [selectedTradeIn, setSelectedTradeIn] = useState<TradeInModelItem | null>(null)
    const [hasTradeIn, setHasTradeIn] = useState<boolean | null>(null)
    const [selectedBudget, setSelectedBudget] = useState<string | null>(null)

    if (!isOpen) return null

    const objectives = [
        {
            id: 'camera',
            title: 'Câmera 4K Pro & Modo Cinema',
            desc: 'Fotos e vídeos em nível de estúdio para redes sociais e trabalho',
            icon: Camera,
            badge: 'Melhor para Criadores'
        },
        {
            id: 'battery',
            title: 'Bateria Infinita (Dia Todo)',
            desc: 'Esqueça o carregador na tomada e use sem preocupação',
            icon: BatteryCharging,
            badge: 'Máxima Autonomia'
        },
        {
            id: 'performance',
            title: 'Performance Gamer & Velocidade',
            desc: 'Zero travamentos em jogos pesados, multitarefa e edição',
            icon: Gamepad2,
            badge: 'Desempenho Extremo'
        },
        {
            id: 'cost_benefit',
            title: 'Super Custo-Benefício',
            desc: 'O melhor aparelho seminovo revisado pelo menor preço do mercado',
            icon: PiggyBank,
            badge: 'Economia Garantida'
        }
    ]

    const budgets = [
        { id: 'ate150', title: 'Até R$ 150/mês', desc: 'Ou até R$ 1.600 à vista' },
        { id: 'ate300', title: 'R$ 150 a R$ 300/mês', desc: 'Ou R$ 1.600 a R$ 3.200 à vista' },
        { id: 'acima300', title: 'Acima de R$ 300/mês ou PIX', desc: 'Melhores modelos topo de linha' }
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

        if (selectedObjective === 'camera') {
            const pro = filtered.find(d => d.model.toLowerCase().includes('pro'))
            if (pro) return pro
        }

        return filtered[0]
    }

    const matchedDevice = getMatchedDevice()
    const tradeInDiscount = (hasTradeIn && selectedTradeIn) ? selectedTradeIn.estimated_value : 0
    const finalCashPrice = matchedDevice ? Math.max(0, matchedDevice.cash_price - tradeInDiscount) : 0
    const finalInstallmentPrice = matchedDevice ? Math.max(0, (matchedDevice.installment_price || matchedDevice.cash_price * 1.12) - tradeInDiscount) : 0

    const sendWhatsAppOffer = () => {
        if (!matchedDevice || !companyPhone) return
        const cleanPhone = companyPhone.replace(/\D/g, '')

        let msg = `🔥 *PROPOSTA DE UPGRADE GERADA NO CATÁLOGO*\n\n`
        msg += `🎯 *Superpoder Desejado:* ${objectives.find(o => o.id === selectedObjective)?.title || 'Geral'}\n`
        msg += `📱 *Aparelho Selecionado:* ${matchedDevice.brand} ${matchedDevice.model} (${matchedDevice.storage || ''})\n`
        msg += `💰 *Preço de Tabela:* ${formatCurrency(matchedDevice.cash_price)}\n`

        if (hasTradeIn && selectedTradeIn) {
            msg += `\n🔁 *Entrada (Meu Celular Usado):* ${selectedTradeIn.model} (${selectedTradeIn.storage})\n`
            msg += `🟢 *Avaliação Estimada:* ${formatCurrency(selectedTradeIn.estimated_value)}\n`
            msg += `🔥 *SALDO RESTANTE À VISTA:* ${formatCurrency(finalCashPrice)}\n`
            msg += `💳 *OU EM 12X DE:* ${formatCurrency(finalInstallmentPrice / 12)}/mês\n`
        } else {
            msg += `🔥 *VALOR À VISTA (PIX):* ${formatCurrency(matchedDevice.cash_price)}\n`
        }

        msg += `\n*Gostaria de fechar este pedido e garantir meu aparelho com essa proposta!*`

        window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank')
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#111622] border border-slate-800 rounded-3xl p-6 md:p-8 max-w-2xl w-full space-y-6 relative my-8 shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl text-black font-black text-xs flex items-center gap-1 shadow-lg" style={{ backgroundColor: themePrimary }}>
                            <Sparkles className="w-4 h-4 fill-current" />
                            QUIZ PRO
                        </div>
                        <span className="text-xs text-slate-400 font-bold">Assistente de Troca & Seleção</span>
                    </div>

                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Animated Progress Bar */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-400">
                        <span>Etapa {step} de 4</span>
                        <span style={{ color: themePrimary }}>{step * 25}% Concluído</span>
                    </div>
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                        <div 
                            className="h-full rounded-full transition-all duration-500 shadow-lg"
                            style={{ width: `${step * 25}%`, backgroundColor: themePrimary }}
                        />
                    </div>
                </div>

                {/* STEP 1: OBJECTIVE */}
                {step === 1 && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="space-y-1 text-center sm:text-left">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Passo 1 de 3</span>
                            <h3 className="text-xl md:text-2xl font-black text-white">Qual é o seu objetivo principal no novo celular?</h3>
                            <p className="text-xs text-slate-400">Escolha o superpoder que você mais valoriza no dia a dia:</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {objectives.map(item => {
                                const Icon = item.icon
                                const isSelected = selectedObjective === item.id
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setSelectedObjective(item.id)}
                                        className={cn(
                                            "p-4 rounded-2xl border text-left transition-all relative overflow-hidden group space-y-2",
                                            isSelected 
                                                ? "bg-slate-900 border-emerald-500 shadow-xl" 
                                                : "bg-[#0A0D14] border-slate-800 hover:border-slate-700"
                                        )}
                                        style={isSelected ? { borderColor: themePrimary } : {}}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="p-2.5 rounded-xl bg-slate-800 text-white group-hover:scale-110 transition-transform">
                                                <Icon className="w-5 h-5" style={isSelected ? { color: themePrimary } : {}} />
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                                                {item.badge}
                                            </span>
                                        </div>

                                        <div>
                                            <h4 className="font-bold text-sm text-white">{item.title}</h4>
                                            <p className="text-[11px] text-slate-400 leading-snug mt-1">{item.desc}</p>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                disabled={!selectedObjective}
                                onClick={() => setStep(2)}
                                className="px-6 py-3 text-black font-black rounded-2xl text-xs uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
                                style={{ backgroundColor: themePrimary }}
                            >
                                Próximo Passo
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 2: TRADE-IN SELECTION */}
                {step === 2 && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="space-y-1 text-center sm:text-left">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Passo 2 de 3</span>
                            <h3 className="text-xl md:text-2xl font-black text-white">Deseja dar seu celular atual na TROCA como entrada?</h3>
                            <p className="text-xs text-slate-400">Avaliamos seu aparelho usado com a melhor cotação da região:</p>
                        </div>

                        {/* Trade in selector buttons */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                onClick={() => setHasTradeIn(true)}
                                className={cn(
                                    "p-4 rounded-2xl border text-left transition-all flex items-center gap-3",
                                    hasTradeIn === true ? "bg-slate-900 border-emerald-500" : "bg-[#0A0D14] border-slate-800"
                                )}
                                style={hasTradeIn === true ? { borderColor: themePrimary } : {}}
                            >
                                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
                                    <Smartphone className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-white">Sim! Quero dar meu celular na troca</h4>
                                    <p className="text-xs text-slate-400">Usar valor como entrada de desconto</p>
                                </div>
                            </button>

                            <button
                                onClick={() => {
                                    setHasTradeIn(false)
                                    setSelectedTradeIn(null)
                                }}
                                className={cn(
                                    "p-4 rounded-2xl border text-left transition-all flex items-center gap-3",
                                    hasTradeIn === false ? "bg-slate-900 border-emerald-500" : "bg-[#0A0D14] border-slate-800"
                                )}
                                style={hasTradeIn === false ? { borderColor: themePrimary } : {}}
                            >
                                <div className="p-3 bg-slate-800 text-slate-400 rounded-xl">
                                    <X className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-white">Não tenho celular na troca</h4>
                                    <p className="text-xs text-slate-400">Quero comprar direto sem dar entrada</p>
                                </div>
                            </button>
                        </div>

                        {/* If Has Trade in, show iPhone visual selector with photos */}
                        {hasTradeIn && (
                            <div className="space-y-3 pt-2">
                                <label className="text-xs font-black uppercase tracking-wider text-emerald-400 block">
                                    Selecione qual o modelo do seu celular atual:
                                </label>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1 pr-2 border border-slate-800 rounded-2xl bg-[#0A0D14]">
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
                        )}

                        <div className="flex items-center justify-between pt-2">
                            <button
                                onClick={() => setStep(1)}
                                className="px-4 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-2xl text-xs flex items-center gap-1.5 hover:bg-slate-700"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Voltar
                            </button>

                            <button
                                disabled={hasTradeIn === null || (hasTradeIn && !selectedTradeIn)}
                                onClick={() => setStep(3)}
                                className="px-6 py-3 text-black font-black rounded-2xl text-xs uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
                                style={{ backgroundColor: themePrimary }}
                            >
                                Próximo Passo
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: BUDGET */}
                {step === 3 && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="space-y-1 text-center sm:text-left">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Passo 3 de 3</span>
                            <h3 className="text-xl md:text-2xl font-black text-white">Qual parcela mensal cabe confortavelmente no seu bolso?</h3>
                            <p className="text-xs text-slate-400">Parcelamos em até 12x no cartão de crédito:</p>
                        </div>

                        <div className="space-y-3">
                            {budgets.map(item => {
                                const isSel = selectedBudget === item.id
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setSelectedBudget(item.id)}
                                        className={cn(
                                            "w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between",
                                            isSel ? "bg-slate-900 border-emerald-500" : "bg-[#0A0D14] border-slate-800"
                                        )}
                                        style={isSel ? { borderColor: themePrimary } : {}}
                                    >
                                        <div>
                                            <h4 className="font-black text-sm text-white">{item.title}</h4>
                                            <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                                        </div>
                                        <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center", isSel ? "border-emerald-400" : "border-slate-700")}>
                                            {isSel && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: themePrimary }} />}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <button
                                onClick={() => setStep(2)}
                                className="px-4 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-2xl text-xs flex items-center gap-1.5 hover:bg-slate-700"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Voltar
                            </button>

                            <button
                                disabled={!selectedBudget}
                                onClick={() => setStep(4)}
                                className="px-6 py-3 text-black font-black rounded-2xl text-xs uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
                                style={{ backgroundColor: themePrimary }}
                            >
                                Ver Resultado Match
                                <Sparkles className="w-4 h-4 fill-current" />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 4: RESULT / VICTORY MATCH */}
                {step === 4 && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="text-center space-y-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full inline-flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5 fill-current" />
                                Análise Concluída com Sucesso
                            </span>
                            <h3 className="text-2xl md:text-3xl font-black text-white">Seu Match Perfeito Encontrado! 🎯</h3>
                            <p className="text-xs text-slate-400 max-w-md mx-auto">
                                Com base nas suas respostas e no valor de troca do seu usado, este é o celular ideal em nosso estoque:
                            </p>
                        </div>

                        {matchedDevice ? (
                            <div className="bg-[#0A0D14] border border-slate-800 rounded-3xl p-5 md:p-6 space-y-5 shadow-2xl relative overflow-hidden">
                                <div className="flex flex-col sm:flex-row items-center gap-5">
                                    <div className="w-32 h-32 bg-black rounded-2xl overflow-hidden border border-slate-800 shrink-0 p-2">
                                        <img 
                                            src={Array.isArray(matchedDevice.images) && matchedDevice.images.length > 0 ? matchedDevice.images[0] : 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&auto=format&fit=crop&q=80'} 
                                            alt={matchedDevice.model} 
                                            className="w-full h-full object-contain"
                                        />
                                    </div>

                                    <div className="space-y-2 text-center sm:text-left flex-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md">
                                            {matchedDevice.brand} • {matchedDevice.storage || 'Estoque'}
                                        </span>
                                        <h4 className="text-xl font-black text-white">{matchedDevice.model}</h4>
                                        <p className="text-xs text-slate-400">
                                            {matchedDevice.color ? `Cor: ${matchedDevice.color} • ` : ''}
                                            {matchedDevice.condition === 'novo_lacrado' ? 'Novo Lacrado' : `Seminovo (Bateria ${matchedDevice.battery_health}%)`}
                                        </p>

                                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 pt-1">
                                            <ShieldCheck className="w-4 h-4" />
                                            <span>Testado & Com Garantia Oficial</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Calculation Breakdown Box */}
                                <div className="p-4 bg-[#111622] border border-slate-800 rounded-2xl space-y-2.5 text-xs">
                                    <div className="flex items-center justify-between text-slate-400 font-semibold">
                                        <span>Preço de Tabela do Celular Novo:</span>
                                        <span className="font-bold text-slate-200">{formatCurrency(matchedDevice.cash_price)}</span>
                                    </div>

                                    {hasTradeIn && selectedTradeIn && (
                                        <div className="flex items-center justify-between text-emerald-400 font-bold pt-1 border-t border-slate-800/80">
                                            <span className="flex items-center gap-1">
                                                <Flame className="w-3.5 h-3.5 fill-current" />
                                                Abatimento pelo seu {selectedTradeIn.model}:
                                            </span>
                                            <span>- {formatCurrency(tradeInDiscount)}</span>
                                        </div>
                                    )}

                                    <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2">
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                {hasTradeIn ? 'SALDO RESTANTE À VISTA (PIX):' : 'PREÇO À VISTA (PIX):'}
                                            </span>
                                            <p className="text-2xl font-black text-emerald-400">{formatCurrency(finalCashPrice)}</p>
                                        </div>

                                        <div className="text-right">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">PARCELADO NO CARTÃO:</span>
                                            <p className="text-xs font-bold text-amber-300">12x de {formatCurrency(finalInstallmentPrice / 12)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* CTA Button */}
                                <button
                                    onClick={sendWhatsAppOffer}
                                    className="w-full py-4 text-black font-black rounded-2xl text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl hover:scale-[1.02] active:scale-95 animate-pulse"
                                    style={{ backgroundColor: themePrimary }}
                                >
                                    <MessageSquare className="w-5 h-5 fill-current" />
                                    GARANTIR ESTA OFERTA NO WHATSAPP AGORA 📲
                                </button>
                            </div>
                        ) : (
                            <p className="text-center text-xs text-slate-400">Nenhum aparelho encontrado para este perfil.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
