'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
    Zap, ArrowRight, Sparkles, Layout, BarChart3,
    MousePointer2, CheckCircle2, ChevronRight,
    ZapIcon, Shield, Clock, Users, ClipboardList,
    Wallet, TrendingUp, PackageSearch, Calendar,
    HelpCircle, Smile, Hourglass, Landmark, Lock, Play
} from 'lucide-react'

// Quiz structure
interface Question {
    id: number
    question: string
    options: {
        label: string
        points: { money: number; time: number; stress: number }
        feedback: string
    }[]
}

const QUIZ_QUESTIONS: Question[] = [
    {
        id: 1,
        question: "Como você controla os orçamentos e Ordens de Serviço hoje?",
        options: [
            {
                label: "OS de papel, blocos impressos ou mensagens no WhatsApp",
                points: { money: 1500, time: 10, stress: 80 },
                feedback: "Você está perdendo em média R$ 1.500 mensais por esquecer de cobrar peças ou perder ordens!"
            },
            {
                label: "Planilhas ou um sistema antigo/lento no computador",
                points: { money: 800, time: 6, stress: 50 },
                feedback: "Sistemas lentos gastam cerca de 6 horas semanais com retrabalho e burocracia."
            },
            {
                label: "Já utilizo um sistema moderno e rápido",
                points: { money: 100, time: 2, stress: 10 },
                feedback: "Excelente! Mas sempre há como otimizar seu faturamento no PDV."
            }
        ]
    },
    {
        id: 2,
        question: "Quanto tempo você gasta para dar um retorno ao cliente sobre o status do conserto?",
        options: [
            {
                label: "Horas ou dias (o cliente liga cobrando toda hora)",
                points: { money: 500, time: 8, stress: 90 },
                feedback: "Clientes cobrando geram um estresse absurdo. No Nexus, o cliente acompanha em tempo real por um link exclusivo!"
            },
            {
                label: "Gasto de 10 a 20 minutos digitando mensagens manuais",
                points: { money: 200, time: 4, stress: 40 },
                feedback: "Esses minutos diários acumulam 4 horas de puro suporte por semana."
            },
            {
                label: "Quase nada, o processo é automatizado",
                points: { money: 0, time: 0, stress: 10 },
                feedback: "Perfeito! Comunicação transparente é a chave da fidelização."
            }
        ]
    },
    {
        id: 3,
        question: "Como está o controle das suas peças e estoque hoje?",
        options: [
            {
                label: "Na cabeça/visual (às vezes falta peça ou compro duplicado)",
                points: { money: 1200, time: 5, stress: 70 },
                feedback: "Peça parada ou falta de estoque custa caro e trava a bancada."
            },
            {
                label: "Anoto as entradas e saídas manualmente em caderno/planilha",
                points: { money: 400, time: 3, stress: 40 },
                feedback: "Anotar tudo à mão consome tempo valioso que poderia ser usado nos reparos."
            },
            {
                label: "Estoque 100% automatizado com alertas de nível mínimo",
                points: { money: 0, time: 1, stress: 5 },
                feedback: "Ótimo! Ter visão clara de estoque evita prejuízos na bancada."
            }
        ]
    }
]

export default function OnboardingFlow() {
    const [step, setStep] = useState(1) // 1: Landing, 2: Quiz, 3: Quiz Result, 4: SignUp/Onboarding Options
    const [isExiting, setIsExiting] = useState(false)
    const [quizIndex, setQuizIndex] = useState(0)
    const [selectedOption, setSelectedOption] = useState<number | null>(null)
    const [quizAnswers, setQuizAnswers] = useState<any[]>([])

    // Consolidated metrics saved
    const [totals, setTotals] = useState({ money: 0, time: 0, stress: 0 })

    const nextStep = (targetStep: number) => {
        setIsExiting(true)
        setTimeout(() => {
            setStep(targetStep)
            setIsExiting(false)
        }, 400)
    }

    const handleQuizOption = (optionIndex: number) => {
        setSelectedOption(optionIndex)
        const answer = QUIZ_QUESTIONS[quizIndex].options[optionIndex]
        
        // Save answers
        setQuizAnswers(prev => [...prev, answer])
        setTotals(prev => ({
            money: prev.money + answer.points.money,
            time: prev.time + answer.points.time,
            stress: Math.max(prev.stress, answer.points.stress)
        }))

        setTimeout(() => {
            setSelectedOption(null)
            if (quizIndex < QUIZ_QUESTIONS.length - 1) {
                setQuizIndex(prev => prev + 1)
            } else {
                nextStep(3) // Go to results
            }
        }, 1200)
    }

    return (
        <div className="min-h-screen bg-[#050510] text-[#E0E0E5] selection:bg-primary/30 selection:text-white overflow-hidden relative">
            {/* Ambient Background Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full opacity-30 animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full opacity-20" />
            </div>

            {/* Navigation */}
            <header className="fixed top-0 w-full z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
                    <div className="flex items-center justify-between px-6 py-3 bg-[#0A0A1F]/40 backdrop-blur-2xl border border-white/5 rounded-2xl">
                        <div className="flex items-center gap-2 group">
                            <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shadow-lg shadow-primary/10">
                                <img src="/logo.png" alt="Nexus Logo" className="w-full h-full object-contain" />
                            </div>
                            <span className="text-lg font-black tracking-tighter text-white">Nexus<span className="text-primary italic">OS</span></span>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="hidden sm:flex items-center gap-4 text-xs">
                                <span className={`font-black uppercase tracking-widest transition-colors ${step === 1 ? 'text-primary' : 'text-white/20'}`}>Início</span>
                                <div className="w-4 h-px bg-white/10" />
                                <span className={`font-black uppercase tracking-widest transition-colors ${step === 2 ? 'text-primary' : 'text-white/20'}`}>Simulador</span>
                                <div className="w-4 h-px bg-white/10" />
                                <span className={`font-black uppercase tracking-widest transition-colors ${step === 3 ? 'text-primary' : 'text-white/20'}`}>Resultado</span>
                                <div className="w-4 h-px bg-white/10" />
                                <span className={`font-black uppercase tracking-widest transition-colors ${step === 4 ? 'text-primary' : 'text-white/20'}`}>Onboarding</span>
                            </div>
                            <div className="h-6 w-px bg-white/10 mx-2 hidden sm:block" />
                            <Link href="/sign-in" className="text-[10px] font-black uppercase tracking-widest text-[#A0A0B5] hover:text-white transition-colors">Entrar</Link>
                        </div>
                    </div>
                </div>
            </header>

            <main className="relative z-10 flex items-center justify-center min-h-screen p-4 pt-28">
                <div className={`max-w-4xl w-full transition-all duration-500 transform ${isExiting ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 scale-100 translate-y-0'}`}>
                    {step === 1 && <StepLanding onStartQuiz={() => nextStep(2)} />}
                    {step === 2 && (
                        <StepQuiz 
                            question={QUIZ_QUESTIONS[quizIndex]}
                            selectedIndex={selectedOption}
                            onSelect={handleQuizOption}
                            progress={((quizIndex + 1) / QUIZ_QUESTIONS.length) * 100}
                        />
                    )}
                    {step === 3 && <StepQuizResult totals={totals} onProceed={() => nextStep(4)} />}
                    {step === 4 && <StepFinal onboardingData={totals} />}
                </div>
            </main>
        </div>
    )
}

function StepLanding({ onStartQuiz }: { onStartQuiz: () => void }) {
    return (
        <div className="text-center space-y-12 py-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest mb-4">
                <Sparkles className="w-3 h-3" />
                <span>Simulação Exclusiva • Para Donos de Assistência Técnica</span>
            </div>

            <div className="space-y-6">
                <h1 className="text-5xl sm:text-7xl font-black tracking-tighter leading-[0.9] text-white">
                    Pare de perder <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-indigo-500">Tempo, Dinheiro e Paz</span>
                </h1>
                <p className="text-lg sm:text-xl text-[#A0A0B5] max-w-2xl mx-auto font-medium leading-relaxed">
                    Descubra em menos de 2 minutos quanto a falta de organização e controle de OS está custando mensalmente para a sua assistência. Faça o teste interativo.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-md mx-auto pt-4">
                <button
                    onClick={onStartQuiz}
                    className="group flex-1 flex items-center justify-center gap-3 bg-primary hover:bg-primary/95 text-white px-8 py-5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all hover:scale-105 shadow-xl shadow-primary/30"
                >
                    Iniciar Teste de Perda
                    <Play className="w-4 h-4 fill-current group-hover:translate-x-1 transition-transform" />
                </button>
            </div>

            {/* Visual highlight cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 max-w-4xl mx-auto">
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-left space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                        <Wallet className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Perda de Faturamento</h3>
                    <p className="text-xs text-[#A0A0B5] leading-relaxed">Orçamentos soltos no WhatsApp ou não cobrados geram prejuízos diários silenciosos.</p>
                </div>
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-left space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                        <Clock className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Tempo Desperdiçado</h3>
                    <p className="text-xs text-[#A0A0B5] leading-relaxed">Horas gastas atualizando clientes de forma manual e organizando ordens antigas.</p>
                </div>
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-left space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                        <Smile className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Estresse e Cobrança</h3>
                    <p className="text-xs text-[#A0A0B5] leading-relaxed">Cobrança e ligações constantes de clientes insatisfeitos com a falta de retorno.</p>
                </div>
            </div>
        </div>
    )
}

function StepQuiz({ 
    question, 
    selectedIndex, 
    onSelect, 
    progress 
}: { 
    question: Question
    selectedIndex: number | null
    onSelect: (idx: number) => void
    progress: number
}) {
    return (
        <div className="space-y-12 max-w-2xl mx-auto py-10">
            {/* Progress */}
            <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-[#A0A0B5]">
                    <span>Simulação de Impacto</span>
                    <span>Pergunta {question.id} de 3</span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
            </div>

            <div className="space-y-8">
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                    {question.question}
                </h2>

                <div className="grid gap-4">
                    {question.options.map((opt, i) => {
                        const isSelected = selectedIndex === i
                        return (
                            <button
                                key={i}
                                onClick={() => selectedIndex === null && onSelect(i)}
                                className={cn(
                                    "p-6 rounded-2xl border text-left transition-all duration-300 flex items-center justify-between group",
                                    isSelected 
                                        ? "bg-primary/20 border-primary text-white scale-[1.01]" 
                                        : "bg-white/[0.02] border-white/5 text-[#A0A0B5] hover:bg-white/[0.05] hover:border-white/10"
                                )}
                            >
                                <span className="text-sm sm:text-base font-bold leading-relaxed">{opt.label}</span>
                                <ChevronRight className="w-5 h-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-4 text-primary" />
                            </button>
                        )
                    })}
                </div>
            </div>

            {selectedIndex !== null && (
                <div className="p-5 rounded-2xl bg-primary/10 border border-primary/20 text-primary text-xs font-bold leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-300">
                    💡 {question.options[selectedIndex].feedback}
                </div>
            )}
        </div>
    )
}

function StepQuizResult({ totals, onProceed }: { totals: { money: number; time: number; stress: number }; onProceed: () => void }) {
    return (
        <div className="space-y-12 max-w-3xl mx-auto py-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-rose-500/20 bg-rose-500/5 text-rose-400 text-[10px] font-black uppercase tracking-widest mb-4">
                <Shield className="w-3 h-3" />
                <span>Simulador de Desperdício Operacional</span>
            </div>

            <div className="space-y-4">
                <h2 className="text-4xl sm:text-6xl font-black tracking-tighter text-white">
                    Seu Relatório de Impacto
                </h2>
                <p className="text-base sm:text-lg text-[#A0A0B5] max-w-xl mx-auto font-medium">
                    Abaixo está o quanto sua assistência técnica está deixando na mesa mensalmente sem a plataforma Nexus OS.
                </p>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto pt-6">
                <div className="p-8 rounded-3xl bg-rose-500/5 border border-rose-500/20 flex flex-col justify-between items-center space-y-4">
                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Dinheiro Perdido</p>
                    <p className="text-4xl font-black text-rose-400 tracking-tighter">R$ {totals.money}</p>
                    <p className="text-[10px] text-[#A0A0B5] font-bold uppercase leading-tight">Por Mês em Cobranças e Peças Esquecidas</p>
                </div>
                
                <div className="p-8 rounded-3xl bg-amber-500/5 border border-amber-500/20 flex flex-col justify-between items-center space-y-4">
                    <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Tempo Perdido</p>
                    <p className="text-4xl font-black text-amber-400 tracking-tighter">{totals.time} hrs</p>
                    <p className="text-[10px] text-[#A0A0B5] font-bold uppercase leading-tight">Semanalmente com Retornos Manuais e Desorganização</p>
                </div>

                <div className="p-8 rounded-3xl bg-purple-500/5 border border-purple-500/20 flex flex-col justify-between items-center space-y-4">
                    <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Nível de Estresse</p>
                    <p className="text-4xl font-black text-purple-400 tracking-tighter">{totals.stress}%</p>
                    <p className="text-[10px] text-[#A0A0B5] font-bold uppercase leading-tight">Sobrecarga de Cobrança e Processos Manuais</p>
                </div>
            </div>

            <div className="space-y-4 pt-6">
                <p className="text-xs text-[#A0A0B5] font-medium max-w-md mx-auto leading-relaxed">
                    Você pode eliminar estes custos operacionais e economizar tempo criando sua conta grátis agora mesmo.
                </p>
                <button
                    onClick={onProceed}
                    className="group flex items-center justify-center gap-3 bg-primary hover:bg-primary/95 text-white px-12 py-5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all hover:scale-105 shadow-xl shadow-primary/30 mx-auto"
                >
                    Criar Conta e Parar Perdas
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </div>
    )
}

function StepFinal({ onboardingData }: { onboardingData: { money: number; time: number; stress: number } }) {
    return (
        <div className="text-center space-y-16 py-10">
            <div className="relative inline-block">
                <div className="absolute inset-0 bg-primary blur-[80px] opacity-20 scale-150 animate-pulse" />
                <div className="relative w-28 h-28 rounded-[2rem] bg-white flex items-center justify-center shadow-2xl mx-auto transform rotate-12 hover:rotate-0 transition-transform duration-700 p-5">
                    <img src="/logo.png" alt="Nexus Logo" className="w-full h-full object-contain" />
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-5xl sm:text-6xl font-black tracking-tighter text-white">
                    Tudo Pronto.
                </h2>
                <p className="text-base sm:text-lg text-[#A0A0B5] max-w-2xl mx-auto font-medium">
                    Crie sua conta para iniciar seu Onboarding Integrado. Você vai preencher os dados essenciais da sua assistência técnica em 1 minuto e aproveitar seus 15 dias totalmente grátis.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 max-w-md mx-auto">
                <Link href="/sign-up" className="w-full bg-primary hover:bg-primary/90 text-white px-10 py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all hover:scale-105 shadow-xl shadow-primary/30 text-center">
                    Criar Minha Conta Grátis
                </Link>
                <Link href="/sign-in" className="w-full bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 text-white px-10 py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all text-center">
                    Já Tenho Conta
                </Link>
            </div>

            {/* Trial Conditions Card */}
            <div className="max-w-lg mx-auto p-6 rounded-2xl bg-white/[0.01] border border-white/5 grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-left">Sem Cartão Necessário</span>
                </div>
                <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-left">Setup em 60 segundos</span>
                </div>
                <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-left">Acesso Pro Total</span>
                </div>
                <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-left">PIX Disponível</span>
                </div>
            </div>

            <div className="pt-10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#505060]">
                    © 2026 Nexus OS. Todos os direitos reservados.
                </p>
            </div>
        </div>
    )
}
