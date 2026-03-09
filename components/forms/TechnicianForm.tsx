'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { toast } from 'sonner'
import { X, Plus, User, Mail, Phone, DollarSign, Percent, Award, Cpu, Save } from 'lucide-react'
import { PremiumInput } from '@/components/ui/PremiumInput'

export default function TechnicianForm({ initial }: { initial?: any }) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [form, setForm] = useState({
        name: initial?.name || '',
        email: initial?.email || '',
        phone: initial?.phone || '',
        hourly_rate: initial?.hourly_rate || '',
        commission_type: initial?.commission_type || 'percentage',
        commission_value: initial?.commission_value || '',
    })
    const [specialties, setSpecialties] = useState<string[]>(initial?.specialties || [])
    const [newSpecialty, setNewSpecialty] = useState('')

    function addSpecialty() {
        if (newSpecialty.trim() && !specialties.includes(newSpecialty.trim())) {
            setSpecialties(p => [...p, newSpecialty.trim()])
            setNewSpecialty('')
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        startTransition(async () => {
            const url = initial?.id ? `/api/technicians/${initial.id}` : '/api/technicians'
            const method = initial?.id ? 'PUT' : 'POST'
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, specialties, hourly_rate: parseFloat(form.hourly_rate) || 0, commission_value: parseFloat(form.commission_value) || 0 }),
            })
            const data = await res.json()
            if (res.ok) {
                toast.success(initial?.id ? 'Especialista atualizado!' : 'Especialista cadastrado!')
                router.push('/technicians')
            } else {
                toast.error(data.error || 'Erro ao salvar especialista')
            }
        })
    }

    return (
        <div className="animate-fade-in pb-20">
            <Header title={initial?.id ? 'Perfil do Especialista' : 'Novo Especialista Técnico'} />

            <form onSubmit={handleSubmit} className="p-6 max-w-4xl mx-auto space-y-12 mt-8">
                <div className="bg-[#0a0a0f]/40 border border-white/5 rounded-[3rem] p-10 backdrop-blur-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 blur-[120px] rounded-full transition-all group-hover:bg-indigo-500/10" />

                    <div className="relative z-10 space-y-8">
                        <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                <Award className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight uppercase">Dados do Técnico</h2>
                                <p className="text-xs text-white/30 font-bold uppercase tracking-widest mt-1">Especialidades e Remuneração</p>
                            </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-8">
                            <div className="sm:col-span-2">
                                <label className="block text-[10px] font-black text-white/30 mb-3 uppercase tracking-widest">NOME DO PROFISSIONAL *</label>
                                <PremiumInput
                                    required
                                    value={form.name}
                                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                    icon={<User className="w-4 h-4" />}
                                    placeholder="Nome completo do técnico"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-white/30 mb-3 uppercase tracking-widest">E-MAIL CORPORATIVO</label>
                                <PremiumInput
                                    type="email"
                                    value={form.email}
                                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                                    icon={<Mail className="w-4 h-4" />}
                                    placeholder="tecnico@nexusos.com"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-white/30 mb-3 uppercase tracking-widest">WHATSAPP / CELULAR</label>
                                <PremiumInput
                                    type="tel"
                                    value={form.phone}
                                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                                    icon={<Phone className="w-4 h-4" />}
                                    placeholder="(11) 99999-9999"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-white/30 mb-3 uppercase tracking-widest">VALOR/HORA TÉCNICA (R$)</label>
                                <PremiumInput
                                    type="number"
                                    step="0.01"
                                    value={form.hourly_rate}
                                    onChange={e => setForm(p => ({ ...p, hourly_rate: e.target.value }))}
                                    icon={<DollarSign className="w-4 h-4" />}
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-white/30 mb-3 uppercase tracking-widest">COMISSÃO SOBRE SERVIÇO (%)</label>
                                <PremiumInput
                                    type="number"
                                    step="0.1"
                                    value={form.commission_value}
                                    onChange={e => setForm(p => ({ ...p, commission_value: e.target.value }))}
                                    icon={<Percent className="w-4 h-4" />}
                                    placeholder="Ex: 10"
                                />
                            </div>
                        </div>

                        {/* Specialties */}
                        <div>
                            <label className="block text-[10px] font-black text-white/30 mb-3 uppercase tracking-widest">ESPECIALIDADES TÉCNICAS</label>
                            <div className="flex gap-3 mb-4">
                                <PremiumInput
                                    value={newSpecialty}
                                    onChange={e => setNewSpecialty(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
                                    placeholder="Ex: Reparo em Placa, Troca de Vidro, Reballing..."
                                    icon={<Cpu className="w-4 h-4" />}
                                    className="flex-1"
                                />
                                <button
                                    type="button"
                                    onClick={addSpecialty}
                                    className="px-6 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all shadow-lg shadow-indigo-500/10"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                            {specialties.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {specialties.map(s => (
                                        <span key={s} className="flex items-center gap-2 pl-4 pr-2 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 text-[10px] font-black uppercase tracking-widest group hover:border-indigo-500/30 hover:text-indigo-400 transition-all">
                                            {s}
                                            <button
                                                type="button"
                                                onClick={() => setSpecialties(p => p.filter(x => x !== s))}
                                                className="p-1 rounded-md hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6 pt-4">
                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full sm:flex-1 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 disabled:opacity-50 text-white p-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
                    >
                        {isPending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                        {isPending ? 'PROCESSANDO...' : 'SALVAR CADASTRO'}
                    </button>
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="w-full sm:w-auto px-10 py-5 rounded-2xl border border-white/5 bg-white/[0.02] text-white/40 font-black text-xs uppercase tracking-[0.2em] hover:bg-white/5 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                        CANCELAR
                    </button>
                </div>
            </form>
        </div>
    )
}

