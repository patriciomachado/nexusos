'use client'

import { PremiumTextarea } from '@/components/ui/PremiumTextarea'
import { PremiumInput } from '@/components/ui/PremiumInput'
import PremiumDateTimePicker from '@/components/ui/PremiumDateTimePicker'
import { Stethoscope, ChevronLeft, ChevronRight, CheckCircle2, Camera } from 'lucide-react'

const DEFAULT_CHECKLIST = [
    { id: 'touch_screen', text: 'Touchscreen / Vidro', completed: false },
    { id: 'display', text: 'Tela / Display', completed: false },
    { id: 'charging_port', text: 'Conector de Carga', completed: false },
    { id: 'front_camera', text: 'Câmera Frontal', completed: false },
    { id: 'back_camera', text: 'Câmera Traseira', completed: false },
    { id: 'speaker', text: 'Alto-falante / Viva-voz', completed: false },
    { id: 'microphone', text: 'Microfone', completed: false },
    { id: 'wifi_bluetooth', text: 'Wi-Fi / Bluetooth', completed: false },
    { id: 'buttons', text: 'Botões (Power/Volume)', completed: false },
    { id: 'sensors_biometrics', text: 'Biometria / Sensores', completed: false },
]

interface Props {
    form: any
    setForm: (fn: (prev: any) => any) => void
    photos: { front: File | null; back: File | null }
    setPhotos: (fn: (prev: any) => any) => void
    photoUrls: { front: string; back: string }
    onNext: () => void
    onBack: () => void
}

export default function StepDiagnosticoForm({ form, setForm, photos, setPhotos, photoUrls, onNext, onBack }: Props) {
    const checklist = form.checklist_progress || DEFAULT_CHECKLIST

    function toggleCheckItem(idx: number) {
        const updated = [...checklist]
        updated[idx] = { ...checklist[idx], completed: !checklist[idx].completed }
        setForm(p => ({ ...p, checklist_progress: updated }))
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="text-center space-y-2 py-4">
                <div className="w-16 h-16 rounded-2xl bg-violet-500/20 text-violet-400 flex items-center justify-center mx-auto border border-violet-500/20 shadow-[0_0_40px_rgba(139,92,246,0.15)]">
                    <Stethoscope className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-foreground tracking-tight">Diagnóstico e Estado Físico</h2>
                <p className="text-sm text-muted-foreground">Documente o estado do equipamento recebido</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Coluna esquerda */}
                <div className="space-y-6">
                    {/* Sintomas */}
                    <div className="bg-card/40 border border-white/5 rounded-[2rem] p-5 backdrop-blur-xl space-y-4">
                        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Relato do Problema</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-muted-foreground mb-2 tracking-widest italic">Sintomas relatados pelo cliente</label>
                                <PremiumTextarea
                                    value={form.problem_description}
                                    onChange={e => setForm(p => ({ ...p, problem_description: e.target.value }))}
                                    placeholder="Descreva o que o cliente relatou..."
                                    rows={3}
                                    className="bg-white/5 border-white/5 focus:border-violet-500/30 p-4"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-muted-foreground mb-2 tracking-widest italic">Laudo Técnico / Observações</label>
                                <PremiumTextarea
                                    value={form.description}
                                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                    placeholder="Sua avaliação técnica inicial..."
                                    rows={3}
                                    className="bg-white/5 border-white/5 focus:border-violet-500/30 p-4"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Estado físico */}
                    <div className="bg-card/40 border border-white/5 rounded-[2rem] p-5 backdrop-blur-xl space-y-4">
                        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Estado Físico</h3>
                        <PremiumTextarea
                            value={form.device_condition}
                            onChange={e => setForm(p => ({ ...p, device_condition: e.target.value }))}
                            placeholder="Ex: Riscos na tela, batida no canto superior..."
                            rows={3}
                            className="bg-white/5 border-white/5 p-4"
                        />

                        {/* Fotos */}
                        <div className="grid grid-cols-2 gap-3">
                            {(['front', 'back'] as const).map((side) => (
                                <div key={side} className="space-y-1.5">
                                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                                        Foto {side === 'front' ? 'Frontal' : 'Traseira'}
                                    </span>
                                    <div className="relative aspect-video rounded-xl border border-white/5 bg-white/5 overflow-hidden group">
                                        <input
                                            type="file" accept="image/*" capture="environment"
                                            className="absolute inset-0 opacity-0 cursor-pointer z-20"
                                            onChange={e => setPhotos((p: any) => ({ ...p, [side]: e.target.files?.[0] || null }))}
                                        />
                                        {photos[side] ? (
                                            <img src={URL.createObjectURL(photos[side]!)} className="w-full h-full object-cover" alt="" />
                                        ) : photoUrls[side] ? (
                                            <img src={photoUrls[side]} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground/30 group-hover:text-muted-foreground/50 transition-colors">
                                                <Camera className="w-5 h-5 mb-1" />
                                                <span className="text-[8px] font-black uppercase tracking-widest">Anexar</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Coluna direita */}
                <div className="space-y-6">
                    {/* Checklist */}
                    <div className="bg-card/40 border border-white/5 rounded-[2rem] p-5 backdrop-blur-xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Checklist do Dispositivo</h3>
                            <span className="text-[9px] text-muted-foreground/50 font-bold">
                                {checklist.filter((i: any) => i.completed).length}/{checklist.length}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {checklist.map((item: any, idx: number) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => toggleCheckItem(idx)}
                                    className={`p-3 rounded-xl text-[11px] font-bold text-left transition-all border flex items-center justify-between gap-2 select-none ${item.completed
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        : 'bg-white/5 text-foreground/50 border-white/5 hover:border-white/10'
                                        }`}
                                >
                                    <span className="truncate">{item.text}</span>
                                    {item.completed ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                                    ) : (
                                        <div className="w-3.5 h-3.5 shrink-0 rounded-full border-2 border-white/10" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Agendamento e Garantia */}
                    <div className="bg-card/40 border border-white/5 rounded-[2rem] p-5 backdrop-blur-xl space-y-5">
                        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Prazos & Garantia</h3>
                        <PremiumDateTimePicker
                            label="Data de Entrega / Agendamento"
                            value={form.scheduled_date}
                            onChange={(val: string) => setForm(p => ({ ...p, scheduled_date: val }))}
                        />
                        <div>
                            <label className="block text-[10px] font-black text-muted-foreground mb-2 uppercase tracking-widest italic">Meses de Garantia</label>
                            <PremiumInput
                                type="number"
                                inputMode="numeric"
                                value={form.warranty_months}
                                onFocus={(e) => { if (e.target.value === '0') setForm((p: any) => ({ ...p, warranty_months: '' })) }}
                                onChange={e => setForm(p => ({ ...p, warranty_months: e.target.value }))}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
                <button
                    type="button"
                    onClick={onBack}
                    className="px-6 py-3 rounded-xl border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2 text-muted-foreground"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Voltar
                </button>
                <button
                    type="button"
                    onClick={onNext}
                    className="px-8 py-4 rounded-2xl bg-violet-500 text-white text-sm font-black uppercase tracking-widest hover:bg-violet-400 transition-all shadow-lg shadow-violet-500/20 flex items-center gap-3"
                >
                    Próximo
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}
