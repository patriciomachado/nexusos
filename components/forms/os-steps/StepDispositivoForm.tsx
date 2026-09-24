'use client'

import PremiumAutocomplete from '@/components/ui/PremiumAutocomplete'
import { PremiumInput } from '@/components/ui/PremiumInput'
import { Smartphone, ChevronLeft, ChevronRight, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

const DEVICE_SUGGESTIONS: string[] = [
    'Notebook', 'Microcomputador', 'Smartphone', 'Tablet', 'Monitor',
    'Impressora', 'Projetor', 'Console de Game', 'MacBook', 'iPad',
    'iPhone', 'Servidor', 'Nobreak', 'Switch/Roteador', 'Pc Gamer',
    'Notebook Acer', 'Notebook Dell', 'Notebook HP', 'Notebook Samsung',
    'Notebook Positivo', 'Impressora HP', 'Impressora Epson',
    'Microcomputador Positivo', 'Microcomputador Dell'
]

interface Props {
    form: any
    setForm: (fn: (prev: any) => any) => void
    onNext: () => void
    onBack: () => void
}

export default function StepDispositivoForm({ form, setForm, onNext, onBack }: Props) {
    function handleNext() {
        if (!form.title.trim()) {
            toast.error('Informe o tipo de dispositivo para continuar')
            return
        }
        onNext()
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="text-center space-y-2 py-4">
                <div className="w-16 h-16 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center mx-auto border border-orange-500/20 shadow-[0_0_40px_rgba(249,115,22,0.15)]">
                    <Smartphone className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-foreground tracking-tight">Qual o dispositivo?</h2>
                <p className="text-sm text-muted-foreground">Identifique o equipamento recebido</p>
            </div>

            {/* Card */}
            <div className="bg-card/40 border border-white/5 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-inner space-y-6">
                {/* Tipo */}
                <div className="relative z-[100]">
                    <label className="block text-[13px] font-medium text-muted-foreground mb-2">
                        Tipo de dispositivo *
                    </label>
                    <PremiumAutocomplete
                        value={form.title}
                        onChange={val => setForm(p => ({ ...p, title: val }))}
                        placeholder="Ex: Smartphone, Notebook..."
                        options={DEVICE_SUGGESTIONS}
                    />
                </div>

                {/* Modelo */}
                <div className="relative z-[90]">
                    <label className="block text-[13px] font-medium text-muted-foreground mb-2">
                        Modelo / Especificação
                    </label>
                    <PremiumAutocomplete
                        value={form.equipment_description}
                        onChange={val => setForm(p => ({ ...p, equipment_description: val }))}
                        placeholder="Ex: iPhone 14 Pro Max, Samsung S23..."
                        options={DEVICE_SUGGESTIONS}
                    />
                </div>

                {/* Serial */}
                <div>
                    <label className="block text-[13px] font-medium text-muted-foreground mb-2">
                        Serial / IMEI
                    </label>
                    <PremiumInput
                        value={form.equipment_serial}
                        onChange={e => setForm(p => ({ ...p, equipment_serial: e.target.value }))}
                        placeholder="Nº de Série ou IMEI..."
                    />
                </div>

                {/* Liga? */}
                <div className="pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-sm font-black text-foreground/80">Aparelho liga?</span>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Estado de funcionamento do dispositivo</p>
                        </div>
                        <div className="flex gap-2">
                            <button
 type="button"
 onClick={() => setForm(p => ({ ...p, turns_on: true }))}
 className={`px-4 py-2.5 rounded-xl text-[13px] font-black transition-all flex items-center gap-2 ${form.turns_on
 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
 : 'bg-white/5 text-muted-foreground border border-white/5'
 }`}
 >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Sim
                            </button>
                            <button
 type="button"
 onClick={() => setForm(p => ({ ...p, turns_on: false }))}
 className={`px-4 py-2.5 rounded-xl text-[13px] font-black transition-all flex items-center gap-2 ${!form.turns_on
 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.2)]'
 : 'bg-white/5 text-muted-foreground border border-white/5'
 }`}
 >
                                <XCircle className="w-3.5 h-3.5" />
                                Não
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
                <button
 type="button"
 onClick={onBack}
 className="px-6 py-3 rounded-xl border border-white/10 bg-white/5 text-[13px] font-black hover:bg-white/10 transition-all flex items-center gap-2 text-muted-foreground"
 >
                    <ChevronLeft className="w-4 h-4" />
                    Voltar
                </button>
                <button
 type="button"
 onClick={handleNext}
 className="px-8 py-4 rounded-2xl bg-orange-500 text-white text-sm font-black hover:bg-orange-400 transition-all shadow-lg shadow-orange-500/20 flex items-center gap-3"
 >
                    Próximo
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}
