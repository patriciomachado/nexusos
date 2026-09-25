'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Trash2 } from 'lucide-react'
import Header from '@/components/layout/Header'
import PremiumConfirmDialog from '@/components/ui/PremiumConfirmDialog'
import { Field, Group, PrimaryButton, SecondaryButton, TextArea, TextInput } from '@/components/ui/form'
import { cn } from '@/lib/utils'

interface Props {
    companyId: string
    customerId?: string
    initial?: Partial<Record<'name' | 'email' | 'phone' | 'cpf_cnpj' | 'address' | 'city' | 'state' | 'zip_code' | 'notes' | 'birth_date', string | null>>
    hideHeader?: boolean
    onSuccess?: (customer: { id: string; name: string }) => void
}

function maskPhone(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 11)
    if (d.length <= 2) return d
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}
function maskDoc(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 14)
    if (d.length <= 11) return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2')
}

/** Customer form in the app's grouped-list style; also used inside the OS/PDV pickers. */
export default function CustomerForm({ customerId, initial, hideHeader, onSuccess }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [more, setMore] = useState(!!(initial?.address || initial?.city || initial?.notes || initial?.cpf_cnpj))
    const [form, setForm] = useState({
        name: initial?.name || '',
        phone: initial?.phone || '',
        email: initial?.email || '',
        birth_date: initial?.birth_date || '',
        cpf_cnpj: initial?.cpf_cnpj || '',
        address: initial?.address || '',
        city: initial?.city || '',
        state: initial?.state || '',
        zip_code: initial?.zip_code || '',
        notes: initial?.notes || '',
    })
    const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }))

    const submit = (e?: React.FormEvent) => {
        e?.preventDefault()
        if (form.name.trim().length < 2) return toast.error('Informe o nome do cliente.')
        startTransition(async () => {
            try {
                const res = await fetch(customerId ? `/api/customers/${customerId}` : '/api/customers', {
                    method: customerId ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...form, name: form.name.trim(), state: form.state.trim().toUpperCase().slice(0, 2) }),
                })
                const data = await res.json().catch(() => ({}))
                if (!res.ok) {
                    const msg = typeof data.error === 'string' ? data.error : data.error?.email?._errors?.[0] ?? data.error?.birth_date?._errors?.[0] ?? 'Não foi possível salvar'
                    throw new Error(msg)
                }
                toast.success(customerId ? 'Cliente atualizado' : 'Cliente cadastrado')
                if (onSuccess) onSuccess({ id: data?.id || customerId || '', name: form.name.trim() })
                else router.push(`/customers/${data?.id || customerId}`)
            } catch (err) {
                toast.error((err as Error).message)
            }
        })
    }

    const remove = () => startTransition(async () => {
        const res = await fetch(`/api/customers/${customerId}`, { method: 'DELETE' })
        if (res.ok) { toast.success('Cliente removido'); router.push('/customers'); router.refresh() }
        else toast.error((await res.json().catch(() => ({}))).error || 'Não foi possível remover')
        setConfirmDelete(false)
    })

    return (
        <div className={cn(!hideHeader && 'min-h-full bg-background')}>
            {!hideHeader && <Header title={customerId ? 'Editar cliente' : 'Novo cliente'} />}
            <form onSubmit={submit} className={cn('space-y-5', !hideHeader && 'max-w-2xl mx-auto px-4 pt-4 pb-16')}>
                <Group>
                    <Field label="Nome" htmlFor="cf-name"><TextInput id="cf-name" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nome completo" autoComplete="name" data-autofocus /></Field>
                    <Field label="WhatsApp" htmlFor="cf-phone"><TextInput id="cf-phone" type="tel" inputMode="tel" value={form.phone} onChange={e => set('phone', maskPhone(e.target.value))} placeholder="(11) 98888-7777" /></Field>
                    <Field label="Aniversário" htmlFor="cf-birth" hint="Para a mensagem automática de parabéns."><TextInput id="cf-birth" type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} /></Field>
                    <Field label="E-mail" htmlFor="cf-email"><TextInput id="cf-email" type="email" inputMode="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="opcional" /></Field>
                </Group>

                {more ? (
                    <>
                        <Group title="Documento e endereço">
                            <Field label="CPF ou CNPJ" htmlFor="cf-doc"><TextInput id="cf-doc" inputMode="numeric" value={form.cpf_cnpj} onChange={e => set('cpf_cnpj', maskDoc(e.target.value))} placeholder="000.000.000-00" /></Field>
                            <Field label="Endereço" htmlFor="cf-addr"><TextInput id="cf-addr" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Rua, número, bairro" /></Field>
                            <div className="grid grid-cols-[1fr_72px_120px] divide-x divide-border/60">
                                <Field label="Cidade" htmlFor="cf-city"><TextInput id="cf-city" value={form.city} onChange={e => set('city', e.target.value)} /></Field>
                                <Field label="UF" htmlFor="cf-uf"><TextInput id="cf-uf" value={form.state} onChange={e => set('state', e.target.value.slice(0, 2))} /></Field>
                                <Field label="CEP" htmlFor="cf-cep"><TextInput id="cf-cep" inputMode="numeric" value={form.zip_code} onChange={e => set('zip_code', e.target.value.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2'))} /></Field>
                            </div>
                        </Group>
                        <Group>
                            <Field label="Observações" htmlFor="cf-notes"><TextArea id="cf-notes" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Preferências, indicações…" /></Field>
                        </Group>
                    </>
                ) : (
                    <button type="button" onClick={() => setMore(true)} className="px-1 text-[15px] text-primary font-medium">+ CPF, endereço e observações</button>
                )}

                <div className="flex gap-2">
                    {customerId && !hideHeader && <SecondaryButton onClick={() => setConfirmDelete(true)} aria-label="Remover" className="text-red-600"><Trash2 className="w-5 h-5" /></SecondaryButton>}
                    <PrimaryButton type="submit" className="flex-1" disabled={isPending}>{isPending && <Loader2 className="w-5 h-5 animate-spin" />}{customerId ? 'Salvar' : 'Cadastrar cliente'}</PrimaryButton>
                </div>
            </form>

            <PremiumConfirmDialog
                isOpen={confirmDelete}
                onCancel={() => setConfirmDelete(false)}
                onConfirm={remove}
                title="Remover cliente?"
                description="O cliente sai da lista. As OS e vendas dele continuam no histórico."
                confirmLabel="Remover"
                variant="danger"
            />
        </div>
    )
}
