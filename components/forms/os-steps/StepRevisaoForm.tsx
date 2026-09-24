'use client'

import { useState } from 'react'
import ItemsManager from '@/components/os/ItemsManager'
import {
    ClipboardCheck, ChevronLeft, Loader2, CheckCircle2,
    User, Smartphone, Stethoscope, ShieldCheck, Lock, Grid3X3
} from 'lucide-react'
import { ShieldCheck as ShieldCheckIcon } from 'lucide-react'

interface Props {
    form: any
    items: any[]
    setItems: (items: any[]) => void
    setForm: (fn: (prev: any) => any) => void
    inventoryItems: any[]
    devicePassword: string
    devicePasswordType: 'pin' | 'pattern'
    customers: { id: string; name: string }[]
    technicians: { id: string; name: string }[]
    isPending: boolean
    isUploading: boolean
    onSubmit: () => void
    onBack: () => void
}

function SummaryCard({ icon: Icon, title, color, children }: any) {
    return (
        <div className={`bg-card/40 border border-white/5 rounded-2xl p-4 backdrop-blur-xl space-y-3`}>
            <div className="flex items-center gap-2.5 pb-2 border-b border-white/5">
                <div className={`p-1.5 rounded-lg ${color}`}>
                    <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">{title}</span>
            </div>
            <div className="space-y-1.5">{children}</div>
        </div>
    )
}

function SummaryRow({ label, value }: { label: string; value?: string | null }) {
    if (!value) return null
    return (
        <div className="flex items-start justify-between gap-4">
            <span className="text-[11px] font-black text-muted-foreground uppercase tracking-wider shrink-0">{label}</span>
            <span className="text-[11px] font-bold text-foreground/80 text-right">{value}</span>
        </div>
    )
}

export default function StepRevisaoForm({
    form, items, setItems, setForm, inventoryItems,
    devicePassword, devicePasswordType,
    customers, technicians,
    isPending, isUploading,
    onSubmit, onBack
}: Props) {
    const customer = customers.find(c => c.id === form.customer_id)
    const technician = technicians.find(t => t.id === form.technician_id)
    const subtotal = items.reduce((sum, item) => sum + (item.total_price || 0), 0)
    const discount = parseFloat(form.discount_amount) || 0
    const total = subtotal - discount

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="text-center space-y-2 py-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.15)]">
                    <ClipboardCheck className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-foreground tracking-tight">Revisão da OS</h2>
                <p className="text-sm text-muted-foreground">Confirme todos os dados antes de criar a ordem de serviço</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                {/* Cliente */}
                <SummaryCard icon={User} title="Cliente" color="bg-indigo-500/10 text-indigo-400">
                    <SummaryRow label="Nome" value={customer?.name || '—'} />
                    <SummaryRow label="Técnico" value={technician?.name} />
                    <SummaryRow label="Status" value={form.status} />
                    <SummaryRow label="Prioridade" value={form.priority} />
                </SummaryCard>

                {/* Dispositivo */}
                <SummaryCard icon={Smartphone} title="Dispositivo" color="bg-orange-500/10 text-orange-400">
                    <SummaryRow label="Tipo" value={form.title} />
                    <SummaryRow label="Modelo" value={form.equipment_description} />
                    <SummaryRow label="Serial" value={form.equipment_serial} />
                    <SummaryRow label="Liga?" value={form.turns_on ? 'Sim' : 'Não'} />
                </SummaryCard>

                {/* Diagnóstico */}
                <SummaryCard icon={Stethoscope} title="Diagnóstico" color="bg-violet-500/10 text-violet-400">
                    <SummaryRow label="Sintomas" value={form.problem_description} />
                    <SummaryRow label="Laudo" value={form.description} />
                    <SummaryRow label="Estado físico" value={form.device_condition} />
                    {form.scheduled_date && <SummaryRow label="Agendamento" value={new Date(form.scheduled_date).toLocaleString('pt-BR')} />}
                    {form.warranty_months && <SummaryRow label="Garantia" value={`${form.warranty_months} ${parseInt(form.warranty_months) === 1 ? 'mês' : 'meses'}`} />}
                </SummaryCard>

                {/* Segurança */}
                <SummaryCard icon={ShieldCheckIcon} title="Segurança" color="bg-amber-500/10 text-amber-400">
                    {devicePassword ? (
                        <>
                            <SummaryRow
                                label="Tipo"
                                value={devicePasswordType === 'pin' ? 'Senha / PIN' : 'Padrão Android'}
                            />
                            <SummaryRow
                                label={devicePasswordType === 'pin' ? 'Senha' : 'Padrão'}
                                value={devicePasswordType === 'pin'
                                    ? '●'.repeat(devicePassword.length)
                                    : `${devicePassword.split('-').length} pontos`
                                }
                            />
                        </>
                    ) : (
                        <p className="text-[11px] text-muted-foreground font-bold italic">Nenhuma senha registrada</p>
                    )}
                </SummaryCard>
            </div>

            {/* Items Manager */}
            <div className="bg-card/40 border border-white/5 rounded-3xl p-4 md:p-8 backdrop-blur-xl shadow-inner relative overflow-visible z-[200]">
                <ItemsManager
                    inventoryItems={inventoryItems}
                    onChange={setItems}
                    items={items}
                />

                {/* Discount + Total */}
                <div className="mt-8 pt-8 border-t border-white/5 flex flex-col md:flex-row items-end md:items-center justify-end gap-8">
                    <div className="w-full md:w-64 space-y-2">
                        <label className="block text-[13px] font-medium text-rose-400/60 px-1">Conceder Desconto (R$)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-rose-400/40">R$</span>
                            <input
                                type="number"
                                inputMode="numeric"
                                step="0.01"
                                value={form.discount_amount}
                                onChange={(e) => {
                                    const disc = e.target.value
                                    setForm(p => {
                                        const sub = items.reduce((s, i) => s + (i.total_price || 0), 0)
                                        return { ...p, discount_amount: disc, estimated_cost: (sub - (parseFloat(disc) || 0)).toFixed(2) }
                                    })
                                }}
                                onFocus={(e) => { if (e.target.value === '0' || e.target.value === '0.00') setForm(p => ({ ...p, discount_amount: '' })) }}
                                className="w-full h-14 bg-rose-500/5 border border-rose-500/10 rounded-2xl pl-12 pr-6 text-base md:text-sm font-black text-rose-400 placeholder:text-rose-500/20 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all tabular-nums"
                                placeholder="0,00"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Total Geral</span>
                        <span className="text-4xl font-black text-emerald-400 tabular-nums tracking-tighter">
                            R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Sujeito a alterações conforme laudo técnico</p>
                    </div>
                </div>
            </div>

            {/* Terms */}
            <div className="bg-card/40 border border-white/5 rounded-2xl p-5 backdrop-blur-xl">
                <div className="flex items-start gap-3 mb-4">
                    <div className="p-1 rounded bg-indigo-500/20 text-indigo-400 mt-0.5 shrink-0">
                        <ShieldCheckIcon className="w-3 h-3" />
                    </div>
                    <p className="text-[11px] font-medium text-muted-foreground leading-relaxed uppercase tracking-widest">
                        O cliente aceita os termos de garantia da assistência, bem como os <a href="/termos" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline font-bold">Termos de Uso</a> e a <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline font-bold">Política de Privacidade</a> do Nexus OS.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setForm(p => ({ ...p, terms_accepted: !p.terms_accepted }))}
                    className={`w-full py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${form.terms_accepted
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white/5 text-muted-foreground border border-white/5'
                        }`}
                >
                    {form.terms_accepted ? '✓ Termos Aceitos' : 'Aceitar Termos'}
                </button>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pb-8">
                <button
                    type="button"
                    onClick={onBack}
                    className="px-6 py-3 rounded-xl border border-white/10 bg-white/5 text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2 text-muted-foreground"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Voltar
                </button>
                <button
                    type="button"
                    onClick={onSubmit}
                    disabled={isPending || isUploading}
                    className="px-10 py-4 rounded-2xl bg-emerald-500 text-white text-sm font-black uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {(isPending || isUploading) ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Criando OS...</>
                    ) : (
                        <><CheckCircle2 className="w-4 h-4" /> Criar OS</>
                    )}
                </button>
            </div>
        </div>
    )
}
