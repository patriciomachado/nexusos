'use client'

import { cn } from '@/lib/utils'
import {
    User, Smartphone, Stethoscope, ShieldCheck,
    ClipboardCheck, CheckCircle2
} from 'lucide-react'

export const WIZARD_STEPS = [
    { id: 1, label: 'Cliente', icon: User },
    { id: 2, label: 'Dispositivo', icon: Smartphone },
    { id: 3, label: 'Diagnóstico', icon: Stethoscope },
    { id: 4, label: 'Segurança', icon: ShieldCheck },
    { id: 5, label: 'Revisão', icon: ClipboardCheck },
    { id: 6, label: 'Criada', icon: CheckCircle2 },
]

interface WizardProgressProps {
    currentStep: number
}

export default function WizardProgress({ currentStep }: WizardProgressProps) {
    return (
        <div className="sticky top-2 md:top-20 z-[400] mx-4 md:mx-0">
            <div className="bg-background/60 backdrop-blur-3xl border border-white/10 rounded-2xl px-4 py-3 shadow-2xl shadow-black/40">
                <div className="flex items-center justify-between relative">
                    {/* Connecting line */}
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-white/5 mx-8 hidden sm:block" />

                    {WIZARD_STEPS.map((step, index) => {
                        const Icon = step.icon
                        const isCompleted = currentStep > step.id
                        const isActive = currentStep === step.id
                        const isPending = currentStep < step.id

                        return (
                            <div
                                key={step.id}
                                className="relative flex flex-col items-center gap-1.5 flex-1"
                            >
                                {/* Step bubble */}
                                <div
                                    className={cn(
                                        'w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center transition-all duration-500 relative z-10',
                                        isCompleted && 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_16px_rgba(16,185,129,0.2)]',
                                        isActive && 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 shadow-[0_0_20px_rgba(99,102,241,0.3)] scale-110',
                                        isPending && 'bg-white/5 text-muted-foreground/40 border border-white/5'
                                    )}
                                >
                                    {isCompleted ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                    ) : (
                                        <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                    )}
                                </div>

                                {/* Label */}
                                <span
                                    className={cn(
                                        'text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all duration-300 hidden sm:block',
                                        isCompleted && 'text-emerald-400/70',
                                        isActive && 'text-indigo-300',
                                        isPending && 'text-muted-foreground/30'
                                    )}
                                >
                                    {step.label}
                                </span>

                                {/* Active step number for mobile */}
                                {isActive && (
                                    <span className="sm:hidden text-[8px] font-black text-indigo-300 uppercase tracking-widest">
                                        {step.label}
                                    </span>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
