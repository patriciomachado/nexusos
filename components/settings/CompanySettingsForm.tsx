'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { PremiumInput } from '@/components/ui/PremiumInput'
import { PremiumTextarea } from '@/components/ui/PremiumTextarea'

interface Props {
    company: any
    companyId: string
}

export default function CompanySettingsForm({ company, companyId }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [form, setForm] = useState({
        name: company?.name || '',
        cnpj: company?.cnpj || '',
        email: company?.email || '',
        phone: company?.phone || '',
        address: company?.address || '',
        city: company?.city || '',
        state: company?.state || '',
        zip_code: company?.zip_code || '',
        warranty_terms: company?.warranty_terms || '',
    })

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        startTransition(async () => {
            const res = await fetch(`/api/company/${companyId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            if (res.ok) {
                toast.success('Perfil da empresa atualizado!')
                router.refresh()
            } else {
                toast.error('Ocorreu um erro ao salvar')
            }
        })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid sm:grid-cols-2 gap-6">
                {[
                    { name: 'name', label: 'RAZÃO SOCIAL / NOME FANTASIA', required: true, colSpan: true },
                    { name: 'cnpj', label: 'CNPJ / CPF' },
                    { name: 'email', label: 'E-MAIL CORPORATIVO' },
                    { name: 'phone', label: 'CONTATO TELEFÔNICO' },
                    { name: 'address', label: 'LOGRADOURO E NÚMERO', colSpan: true },
                    { name: 'city', label: 'CIDADE' },
                    { name: 'state', label: 'ESTADO (UF)' },
                    { name: 'zip_code', label: 'CEP' },
                ].map(f => (
                    <div key={f.name} className={f.colSpan ? 'sm:col-span-2' : ''}>
                        <label className="block text-[10px] font-black text-muted-foreground/60 mb-2 uppercase tracking-[0.2em]">{f.label}</label>
                        <PremiumInput
                            name={f.name}
                            value={(form as any)[f.name]}
                            onChange={e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))}
                            required={f.required}
                        />
                    </div>
                ))}

                <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black text-rose-400 mb-2 uppercase tracking-[0.2em]">Termos de Garantia / Contrato de Entrada</label>
                    <PremiumTextarea
                        name="warranty_terms"
                        value={form.warranty_terms}
                        onChange={e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))}
                        rows={6}
                        placeholder="Descreva aqui os termos que o cliente aceita ao deixar o equipamento..."
                        className="min-h-[150px]"
                    />
                    <p className="mt-2 text-[9px] text-muted-foreground/40 font-bold uppercase tracking-widest leading-relaxed">
                        Estes termos serão exibidos no momento da entrada do equipamento para aceite do cliente.
                    </p>
                </div>
            </div>

            <div className="pt-6 border-t border-border flex justify-end">
                <button
                    type="submit"
                    disabled={isPending}
                    className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                >
                    {isPending ? 'PROCESSANDO...' : (
                        <>
                            <Save className="w-4 h-4" />
                            ATUALIZAR CONFIGURAÇÕES
                        </>
                    )}
                </button>
            </div>
        </form>
    )
}
