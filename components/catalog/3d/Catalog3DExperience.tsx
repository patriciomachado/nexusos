'use client'

import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { use3dCatalogStore } from '@/lib/store/use3dCatalogStore'
import StylizedSmartphone from './StylizedSmartphone'
import HudGridEnvironment from './HudGridEnvironment'
import ProgressBar3D from './ProgressBar3D'
import PostProcessingPipeline from './PostProcessingPipeline'
import AchievementBadge3D from './AchievementBadge3D'
import ParticleTrail3D from './ParticleTrail3D'
import PriceBreakdown3D from './PriceBreakdown3D'
import WhatsAppCTA3D from './WhatsAppCTA3D'
import { Device } from '@/types/devices'
import { formatCurrency } from '@/lib/utils'
import { Sparkles, MessageSquare, ShieldCheck, Zap, ArrowRight, RefreshCw } from 'lucide-react'

import { usePerformanceTier } from '@/lib/hooks/usePerformanceTier'

if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger)
}

interface Catalog3DExperienceProps {
    devices: Device[]
    companyName: string
    companyPhone: string
    themePrimary?: string
    rate12x?: number
    rate24x?: number
    onOpenTradeIn?: (device: Device) => void
}

export default function Catalog3DExperience({
    devices = [],
    companyName = 'Nexus Store',
    companyPhone = '',
    themePrimary = '#00F0FF',
    rate12x = 10,
    rate24x = 18,
    onOpenTradeIn,
}: Catalog3DExperienceProps) {
    usePerformanceTier()
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const setScrollProgress = use3dCatalogStore((state) => state.setScrollProgress)
    const activeSection = use3dCatalogStore((state) => state.activeSection)
    const activeSectionIndex = use3dCatalogStore((state) => state.activeSectionIndex)
    const selectedDeviceIndex = use3dCatalogStore((state) => state.selectedDeviceIndex)
    const setSelectedDeviceIndex = use3dCatalogStore((state) => state.setSelectedDeviceIndex)

    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    useEffect(() => {
        if (!isMounted || !scrollContainerRef.current) return

        const trigger = ScrollTrigger.create({
            trigger: scrollContainerRef.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.5,
            onUpdate: (self) => {
                setScrollProgress(self.progress)
            },
        })

        return () => {
            trigger.kill()
        }
    }, [isMounted, setScrollProgress])

    const currentDevice = devices[selectedDeviceIndex] || devices[0] || {
        id: '1',
        brand: 'Apple',
        model: 'iPhone 15 Pro Max',
        storage: '256GB',
        color: 'Titanium Escuro',
        condition: 'seminovo_premium',
        cash_price: 5800,
        battery_health: 98,
    }

    const price12x = (currentDevice.cash_price * (1 + rate12x / 100)) / 12
    const price24x = (currentDevice.cash_price * (1 + rate24x / 100)) / 24

    const openWhatsApp = () => {
        const cleanPhone = companyPhone.replace(/\D/g, '')
        const msg = `Olá ${companyName}! Vi no catálogo 3D e quero resgatar o celular *${currentDevice.brand} ${currentDevice.model} ${currentDevice.storage || ''}* (${formatCurrency(currentDevice.cash_price)} à vista)!`
        window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank')
    }

    if (!isMounted) return null

    return (
        <div className="relative w-full text-white bg-[#030712] overflow-x-hidden font-sans">
            {/* STICKY 3D CANVAS BACKDROP */}
            <div className="fixed inset-0 z-0 pointer-events-auto">
                <Canvas
                        camera={{ position: [0, 0, 5], fov: 45 }}
                        dpr={[1, 2]}
                        gl={{ antialias: true, alpha: false }}
                    >
                        <color attach="background" args={['#030712']} />
                        <HudGridEnvironment primaryColor={themePrimary} accentColor="#10B981" />
                        
                        {/* 3D PROGRESS BAR & DYNAMIC PARTICLE TRAIL */}
                        <ProgressBar3D primaryColor={themePrimary} />
                        <ParticleTrail3D color={themePrimary} />

                        {/* 3D GAMIFIED UNLOCK BADGE */}
                        <AchievementBadge3D title="MATCH LEGENDÁRIO" color="#10B981" />

                        {/* CENTRAL STYLIZED SMARTPHONE MODEL */}
                        <StylizedSmartphone
                            brand={currentDevice.brand}
                            model={currentDevice.model}
                            color={currentDevice.color ?? undefined}
                            accentColor={themePrimary}
                        />

                        {/* 3D PRICE BREAKDOWN & ABATEMENT */}
                        <PriceBreakdown3D
                            tablePrice={currentDevice.cash_price * 1.15}
                            tradeInDiscount={currentDevice.cash_price * 0.15}
                            cashPrice={currentDevice.cash_price}
                            rate12x={rate12x}
                            rate24x={rate24x}
                        />

                        {/* 3D PHYSICAL WHATSAPP CTA BUTTON */}
                        <WhatsAppCTA3D
                            companyName={companyName}
                            companyPhone={companyPhone}
                            modelName={`${currentDevice.brand} ${currentDevice.model}`}
                            price={currentDevice.cash_price}
                        />

                        {/* POST PROCESSING CINEMATIC PIPELINE */}
                        <PostProcessingPipeline />
                    </Canvas>
            </div>

            {/* FIXED TOP GAMIFIED HUD HEADER */}
            <header className="fixed top-0 left-0 right-0 z-40 p-4 backdrop-blur-md bg-black/40 border-b border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full animate-ping" style={{ backgroundColor: themePrimary }} />
                    <span className="font-mono text-xs font-black uppercase tracking-widest text-slate-300">
                        {companyName} • FAZA 0{activeSectionIndex + 1}: {activeSection.toUpperCase()}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-full flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> MATCH LEGENDÁRIO
                    </span>
                </div>
            </header>

            {/* SCROLL TRIGGER CONTAINER (5 HEIGHT UNITS) */}
            <div ref={scrollContainerRef} className="relative z-10 w-full">
                
                {/* SECTION 1: HERO / INTRO */}
                <section className="h-screen w-full flex items-center justify-start px-6 md:px-16 pointer-events-none">
                    <div className="max-w-xl space-y-6 pointer-events-auto bg-black/60 backdrop-blur-xl p-8 rounded-3xl border border-cyan-500/30 shadow-2xl">
                        <span className="text-xs font-mono font-black text-cyan-400 tracking-widest uppercase flex items-center gap-2">
                            <Zap className="w-4 h-4" /> NEXUS 3D EXPERIENCE
                        </span>
                        <h1 className="text-3xl md:text-5xl font-black text-white leading-tight">
                            Jornada de Troca <span style={{ color: themePrimary }}>Next-Gen</span>.
                        </h1>
                        <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                            Role para baixo para desbloquear seu celular dos sonhos com condições exclusivas de troca e parcelamento sem juros abusivos.
                        </p>
                        <div className="pt-2 flex items-center gap-2 text-xs font-bold text-cyan-400 animate-bounce">
                            <ArrowRight className="w-4 h-4 rotate-90" />
                            <span>Role para explorar o modelo 3D</span>
                        </div>
                    </div>
                </section>

                {/* SECTION 2: GAMIFICATION & PROGRESS */}
                <section className="h-screen w-full flex items-center justify-end px-6 md:px-16 pointer-events-none">
                    <div className="max-w-md space-y-4 pointer-events-auto bg-black/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-800 shadow-2xl">
                        <div className="flex items-center gap-2 text-xs font-black text-amber-400">
                            <Sparkles className="w-4 h-4 fill-current" />
                            CONQUISTA DESBLOQUEADA: JOGADOR ELITE
                        </div>
                        <h2 className="text-xl md:text-2xl font-black text-white">
                            Seu progresso libera descontos reais de troca.
                        </h2>
                        <p className="text-xs text-slate-300">
                            Ao dar seu celular atual de entrada, você abate até <span className="text-emerald-400 font-black">R$ 5.800,00</span> na hora!
                        </p>
                    </div>
                </section>

                {/* SECTION 3: PRODUCT GALLERY SELECTOR */}
                <section className="h-screen w-full flex items-center justify-between px-6 md:px-16 pointer-events-none">
                    {/* Left Panel: Device Selector */}
                    <div className="max-w-sm space-y-3 pointer-events-auto bg-black/70 backdrop-blur-xl p-5 rounded-3xl border border-slate-800 shadow-2xl">
                        <h3 className="text-xs font-mono font-black uppercase text-slate-400">Escolha o Aparelho:</h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {devices.map((dev, idx) => (
                                <button
                                    key={dev.id}
                                    onClick={() => setSelectedDeviceIndex(idx)}
                                    className={`w-full text-left p-3 rounded-2xl text-xs font-bold transition-all border ${
                                        selectedDeviceIndex === idx
                                            ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-lg'
                                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span>{dev.brand} {dev.model}</span>
                                        <span className="text-emerald-400 font-mono">{formatCurrency(dev.cash_price)}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-normal">{dev.storage} • {dev.color}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right Panel: Floating Specs HUD */}
                    <div className="max-w-xs space-y-3 pointer-events-auto bg-black/70 backdrop-blur-xl p-5 rounded-3xl border border-cyan-500/40 shadow-2xl">
                        <span className="text-[10px] font-mono font-black text-cyan-400 uppercase tracking-widest">ESPECIFICAÇÕES TÉCNICAS</span>
                        <h3 className="text-lg font-black text-white">{currentDevice.brand} {currentDevice.model}</h3>
                        <div className="space-y-1.5 text-xs text-slate-300">
                            <p className="flex justify-between border-b border-slate-800 pb-1">
                                <span className="text-slate-400">Saúde Bateria:</span>
                                <span className="text-emerald-400 font-bold">{currentDevice.battery_health}%</span>
                            </p>
                            <p className="flex justify-between border-b border-slate-800 pb-1">
                                <span className="text-slate-400">Condição:</span>
                                <span className="text-white font-bold">{currentDevice.condition === 'novo_lacrado' ? 'Novo Lacrado' : 'Seminovo Premium'}</span>
                            </p>
                            <p className="flex justify-between">
                                <span className="text-slate-400">Garantia:</span>
                                <span className="text-cyan-400 font-bold">Inclusa Nexus</span>
                            </p>
                        </div>
                    </div>
                </section>

                {/* SECTION 4: PRICING BREAKDOWN */}
                <section className="h-screen w-full flex items-center justify-center px-6 md:px-16 pointer-events-none">
                    <div className="max-w-lg w-full pointer-events-auto bg-black/80 backdrop-blur-2xl p-8 rounded-3xl border-2 border-emerald-500/50 shadow-2xl text-center space-y-6">
                        <span className="text-xs font-mono font-black text-emerald-400 uppercase tracking-widest">FASE FINAL • CONDIÇÃO ESPECIAL PIX</span>
                        
                        <div className="space-y-1">
                            <p className="text-xs text-slate-400 line-through">De: {formatCurrency(currentDevice.cash_price * 1.15)}</p>
                            <h2 className="text-4xl md:text-5xl font-black text-emerald-400 tracking-tight drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                                {formatCurrency(currentDevice.cash_price)}
                            </h2>
                            <p className="text-xs text-slate-300 font-bold">à vista no PIX com entrega imediata</p>
                        </div>

                        {/* Card Installments */}
                        <div className="grid grid-cols-2 gap-3 text-left">
                            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl">
                                <span className="text-[10px] font-black uppercase text-slate-400">12x no Cartão</span>
                                <p className="text-sm font-black text-cyan-400 font-mono">12x {formatCurrency(price12x)}</p>
                            </div>
                            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl">
                                <span className="text-[10px] font-black uppercase text-slate-400">24x no Cartão</span>
                                <p className="text-sm font-black text-amber-300 font-mono">24x {formatCurrency(price24x)}</p>
                            </div>
                        </div>

                        {onOpenTradeIn && (
                            <button
                                onClick={() => onOpenTradeIn(currentDevice)}
                                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 border border-cyan-500/30 transition-all"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Calcular valor do meu seminovo na troca
                            </button>
                        )}
                    </div>
                </section>

                {/* SECTION 5: FINAL WHATSAPP CTA */}
                <section className="h-screen w-full flex items-center justify-center px-6 md:px-16 pointer-events-none">
                    <div className="max-w-xl w-full pointer-events-auto bg-gradient-to-b from-emerald-950/80 to-black backdrop-blur-2xl p-8 rounded-3xl border-2 border-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.3)] text-center space-y-6">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center mx-auto animate-pulse">
                            <MessageSquare className="w-8 h-8 text-emerald-400 fill-current" />
                        </div>
                        <h2 className="text-2xl md:text-4xl font-black text-white">
                            Resgatar meu celular no WhatsApp agora!
                        </h2>
                        <p className="text-xs md:text-sm text-slate-300 max-w-md mx-auto">
                            Garanta a reserva do {currentDevice.brand} {currentDevice.model} antes que esgoste no estoque de {companyName}.
                        </p>
                        <button
                            onClick={openWhatsApp}
                            className="w-full py-5 bg-emerald-400 hover:bg-emerald-300 text-black font-black rounded-2xl text-sm md:text-base uppercase tracking-wider transition-all shadow-[0_0_30px_rgba(52,211,153,0.8)] hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
                        >
                            <MessageSquare className="w-6 h-6 fill-current" />
                            RESGATAR NO WHATSAPP AGORA ➔
                        </button>
                    </div>
                </section>
            </div>
        </div>
    )
}
