'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Plus, X } from 'lucide-react'
import Header from '@/components/layout/Header'
import { Field, Group, PrimaryButton, SecondaryButton, TextInput } from '@/components/ui/form'

interface TechnicianInitial {
    id?: string
    name?: string
    email?: string
    phone?: string
    hourly_rate?: number | string
    commission_type?: string
    commission_value?: number | string
    specialties?: string[]
}

export default function TechnicianForm({ initial }: { initial?: TechnicianInitial }) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [form, setForm] = useState({
        name: initial?.name || '',
        email: initial?.email || '',
        phone: initial?.phone || '',
        hourly_rate: String(initial?.hourly_rate ?? ''),
        commission_type: initial?.commission_type || 'percentage',
        commission_value: String(initial?.commission_value ?? ''),
    })
    const [specialties, setSpecialties] = useState<string[]>(initial?.specialties || [])
    const [newSpecialty, setNewSpecialty] = useState('')
    const set = (key: keyof typeof form, value: string) => setForm(p => ({ ...p, [key]: value }))
    const num = (v: string) => parseFloat(v.replace(',', '.')) || 0

    function addSpecialty() {
        const s = newSpecialty.trim()
        if (s && !specialties.includes(s)) setSpecialties(p => [...p, s])
        setNewSpecialty('')
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!form.name.trim()) { toast.error('Informe o nome do técnico'); return }
        startTransition(async () => {
            const url = initial?.id ? `/api/technicians/${initial.id}` : '/api/technicians'
            const res = await fetch(url, {
                method: initial?.id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, name: form.name.trim(), specialties, hourly_rate: num(form.hourly_rate), commission_value: num(form.commission_value) }),
            })
            const data = await res.json().catch(() => ({}))
            if (res.ok) {
                toast.success(initial?.id ? 'Técnico atualizado' : 'Técnico cadastrado')
                router.push('/technicians')
            } else {
                toast.error(typeof data.error === 'string' ? data.error : 'Não foi possível salvar. Confira os campos e tente de novo.')
            }
        })
    }

    return (
        <div className="min-h-full bg-background">
            <Header title={initial?.id ? 'Editar técnico' : 'Novo técnico'} />
            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 pt-4 pb-16 space-y-5">
                <Group>
                    <Field label="Nome" htmlFor="tf-name"><TextInput id="tf-name" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nome completo" autoComplete="name" data-autofocus /></Field>
                    <Field label="WhatsApp" htmlFor="tf-phone"><TextInput id="tf-phone" type="tel" inputMode="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(11) 99999-9999" /></Field>
                    <Field label="E-mail" htmlFor="tf-email"><TextInput id="tf-email" type="email" inputMode="email" spellCheck={false} value={form.email} onChange={e => set('email', e.target.value)} placeholder="opcional" /></Field>
                </Group>

                <Group title="Remuneração">
                    <div className="grid grid-cols-2 divide-x divide-border/60">
                        <Field label="Valor/hora (R$)" htmlFor="tf-rate"><TextInput id="tf-rate" inputMode="decimal" value={form.hourly_rate} onChange={e => set('hourly_rate', e.target.value.replace(/[^\d.,]/g, ''))} placeholder="0,00" /></Field>
                        <Field label="Comissão (%)" htmlFor="tf-comm"><TextInput id="tf-comm" inputMode="decimal" value={form.commission_value} onChange={e => set('commission_value', e.target.value.replace(/[^\d.,]/g, ''))} placeholder="Ex.: 10" /></Field>
                    </div>
                </Group>

                <Group title="Especialidades" footer="Ex.: reparo em placa, troca de vidro, reballing.">
                    <div className="flex items-center gap-2 pr-2">
                        <Field label="Nova especialidade" htmlFor="tf-spec" className="flex-1">
                            <TextInput
                                id="tf-spec"
                                value={newSpecialty}
                                onChange={e => setNewSpecialty(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSpecialty() } }}
                                placeholder="Digite e toque em +"
                            />
                        </Field>
                        <button type="button" onClick={addSpecialty} aria-label="Adicionar especialidade" className="w-11 h-11 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/15 transition-colors">
                            <Plus aria-hidden className="w-5 h-5" />
                        </button>
                    </div>
                    {specialties.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-3">
                            {specialties.map(s => (
                                <span key={s} className="inline-flex items-center gap-1 h-9 pl-3.5 pr-1 rounded-full bg-foreground/[0.06] text-[15px] max-w-full">
                                    <span className="truncate">{s}</span>
                                    <button type="button" onClick={() => setSpecialties(p => p.filter(x => x !== s))} aria-label={`Remover ${s}`} className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-foreground/[0.08] transition-colors">
                                        <X aria-hidden className="w-4 h-4" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </Group>

                <div className="flex gap-2">
                    <SecondaryButton onClick={() => router.back()}>Cancelar</SecondaryButton>
                    <PrimaryButton type="submit" className="flex-1" disabled={isPending}>
                        {isPending && <Loader2 aria-hidden className="w-5 h-5 animate-spin" />}
                        {initial?.id ? 'Salvar' : 'Cadastrar técnico'}
                    </PrimaryButton>
                </div>
            </form>
        </div>
    )
}
