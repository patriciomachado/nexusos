'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    Zap, ArrowRight, Sparkles, Layout, BarChart3,
    MousePointer2, CheckCircle2, ChevronRight,
    ZapIcon, Shield, Clock, Users, ClipboardList,
    Wallet, TrendingUp, PackageSearch, Calendar
} from 'lucide-react'

export default function OnboardingFlow() {
    const [step, setStep] = useState(1)
    const [isExiting, setIsExiting] = useState(false)

    const nextStep = () => {
        setIsExiting(true)
        setTimeout(() => {
            setStep(s => s + 1)
            setIsExiting(false)
        }, 400)
    }

    return (
        <div className="min-h-screen bg-[#050510] text-[#E0E0E5] selection:bg-primary/30 selection:text-white overflow-hidden relative">
            {/* Ambient Background Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full opacity-30 animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full opacity-20" />
            </div>

            {/* Navigation (Sticky for context) */}
            <header className="fixed top-0 w-full z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
                    <div className="flex items-center justify-between px-6 py-3 bg-[#0A0A1F]/40 backdrop-blur-2xl border border-white/5 rounded-2xl">
                        <div className="flex items-center gap-2 group">
                            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                                <Zap className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-lg font-black tracking-tighter text-white">Nexus<span className="text-primary italic">OS</span></span>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="hidden sm:flex items-center gap-4">
                                <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${step === 1 ? 'text-primary' : 'text-white/20'}`}>Início</span>
                                <div className="w-4 h-px bg-white/10" />
                                <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${step === 2 ? 'text-primary' : 'text-white/20'}`}>Recursos</span>
                                <div className="w-4 h-px bg-white/10" />
                                <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${step === 3 ? 'text-primary' : 'text-white/20'}`}>Pronto</span>
                            </div>
                            <div className="h-6 w-px bg-white/10 mx-2 hidden sm:block" />
                            <Link href="/sign-in" className="text-[10px] font-black uppercase tracking-widest text-[#A0A0B5] hover:text-white transition-colors">Entrar</Link>
                        </div>
                    </div>
                </div>
            </header>

            <main className="relative z-10 flex items-center justify-center min-h-screen p-4">
                <div className={`max-w-4xl w-full transition-all duration-500 transform ${isExiting ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 scale-100 translate-y-0'}`}>
                    {step === 1 && <StepWelcome onNext={nextStep} />}
                    {step === 2 && <StepFeatures onNext={nextStep} />}
                    {step === 3 && <StepFinal />}
                </div>
            </main>

            {/* Progress Bar (Bottom) */}
            <div className="fixed bottom-0 left-0 w-full h-1 bg-white/5 z-50">
                <div
                    className="h-full bg-primary transition-all duration-1000 ease-out"
                    style={{ width: `${(step / 3) * 100}%` }}
                />
            </div>
        </div>
    )
}

function StepWelcome({ onNext }: { onNext: () => void }) {
    return (
        <div className="text-center space-y-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest mb-4">
                <Sparkles className="w-3 h-3" />
                <span>Onboarding • Etapa 1 de 3</span>
            </div>

            <div className="space-y-6">
                <h1 className="text-6xl sm:text-8xl font-black tracking-tighter leading-[0.8] text-white">
                    Bem-vindo ao <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-indigo-500">Nexus OS</span>
                </h1>
                <p className="text-xl text-[#A0A0B5] max-w-2xl mx-auto font-medium leading-relaxed">
                    A solução definitiva para acelerar sua gestão e escalar seus resultados. Transforme a complexidade em agilidade operacional hoje mesmo.
                </p>
            </div>

            <button
                onClick={onNext}
                className="group flex items-center gap-3 bg-primary hover:bg-primary/90 text-white px-12 py-6 rounded-2xl text-sm font-black uppercase tracking-widest transition-all hover:scale-105 shadow-2xl shadow-primary/40 mx-auto"
            >
                Iniciar Configuração
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="grid grid-cols-3 gap-4 pt-12 max-w-lg mx-auto opacity-30 grayscale pointer-events-none">
                <div className="h-2 w-full bg-white/10 rounded-full" />
                <div className="h-2 w-full bg-white/10 rounded-full" />
                <div className="h-2 w-full bg-white/10 rounded-full" />
            </div>
        </div>
    )
}

function StepFeatures({ onNext }: { onNext: () => void }) {
    const features = [
        {
            icon: <Wallet className="w-6 h-6" />,
            title: "Faturamento Ágil",
            desc: "PDV otimizado para vendas rápidas e controle de caixa em tempo real."
        },
        {
            icon: <ClipboardList className="w-6 h-6" />,
            title: "Gestão de OS",
            desc: "Controle absoluto de ordens de serviço, do orçamento à entrega final."
        },
        {
            icon: <PackageSearch className="w-6 h-6" />,
            title: "Estoque Inteligente",
            desc: "Baixa automática e alertas de reposição para nunca perder uma venda."
        },
        {
            icon: <Users className="w-6 h-6" />,
            title: "Gestão de Equipe",
            desc: "Atribuição de técnicos e controle de produtividade por funcionário."
        },
        {
            icon: <TrendingUp className="w-6 h-6" />,
            title: "Relatórios de Performance",
            desc: "Insights valiosos sobre faturamento e crescimento do seu negócio."
        },
        {
            icon: <Calendar className="w-6 h-6" />,
            title: "Agendamentos",
            desc: "Organização impecável de compromissos e visitas técnicas sincronizadas."
        }
    ]

    return (
        <div className="space-y-16">
            <div className="text-center space-y-6">
                <div className="flex items-center justify-center gap-3 mb-6">
                    <div className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
                        <span className="text-primary text-[10px] font-black uppercase tracking-widest">66% Concluído</span>
                    </div>
                </div>
                <h2 className="text-5xl sm:text-6xl font-black tracking-tighter text-white leading-tight">
                    Gestão Ágil, <br /> Resultados Reais.
                </h2>
                <p className="text-lg text-[#A0A0B5] max-w-2xl mx-auto font-medium">
                    Elimine gargalos operacionais com ferramentas desenhadas para velocidade máxima. Onde outros sistemas travam, o Nexus OS entrega agilidade.
                </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {features.map((f, i) => (
                    <div key={i} className="p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-primary/20 transition-all hover:bg-white/[0.08] group relative overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                            {f.icon}
                        </div>
                        <h3 className="text-sm font-black text-white mb-2">{f.title}</h3>
                        <p className="text-xs text-[#A0A0B5] font-medium leading-relaxed">
                            {f.desc}
                        </p>
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 blur-[40px] rounded-full -mr-12 -mt-12 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                ))}
            </div>

            <button
                onClick={onNext}
                className="group flex items-center gap-3 bg-white text-[#050510] px-12 py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:scale-105 mx-auto"
            >
                Prosseguir para o App
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
        </div>
    )
}

function StepFinal() {
    return (
        <div className="text-center space-y-16">
            <div className="relative inline-block">
                <div className="absolute inset-0 bg-primary blur-[80px] opacity-20 scale-150 animate-pulse" />
                <div className="relative w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-2xl mx-auto transform rotate-12 hover:rotate-0 transition-transform duration-700">
                    <Zap className="w-16 h-16 text-white" />
                </div>
            </div>

            <div className="space-y-6">
                <h2 className="text-6xl sm:text-7xl font-black tracking-tighter text-white">
                    Tudo Pronto.
                </h2>
                <p className="text-xl text-[#A0A0B5] max-w-2xl mx-auto font-medium">
                    Sua operação mais rápida e eficiente começa agora. Domine seu mercado com a agilidade imbatível do Nexus OS.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Link href="/sign-up" className="bg-primary hover:bg-primary/90 text-white px-12 py-6 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:scale-105 shadow-2xl shadow-primary/40 relative overflow-hidden group">
                    <span className="relative z-10">Experimentar 30 Dias Grátis</span>
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform" />
                </Link>
                <Link href="/sign-in" className="bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 text-white px-12 py-6 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all">
                    Acessar Dashboard
                </Link>
            </div>

            <div className="pt-20">
                <div className="flex gap-8 justify-center mb-8">
                    {['Privacidade', 'Termos de Uso', 'Ajuda'].map((item) => (
                        <a key={item} href="#" className="text-[10px] font-bold uppercase tracking-widest text-[#505060] hover:text-primary transition-colors">
                            {item}
                        </a>
                    ))}
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#505060]">
                    © 2024 Nexus OS. Todos os direitos reservados.
                </p>
            </div>
        </div>
    )
}
