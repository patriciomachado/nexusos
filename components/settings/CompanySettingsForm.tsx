'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save, Building2, MapPin, Mail, Phone, Hash, ShieldCheck, Sparkles, Loader2 } from 'lucide-react'
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
        <form onSubmit={handleSubmit} className="space-y-12 animate-in fade-in duration-700">
            <div className="grid sm:grid-cols-2 gap-10">
                <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-3 ml-2 italic">Entidade Jurídica / Nome</label>
                    <PremiumInput
                        name="name"
                        value={form.name}
                        onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                        required
                        icon={<Building2 className="w-4 h-4" />}
                        placeholder="Nexus OS Enterprise Solutions"
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-3 ml-2 italic">Registro Fiscal (CNPJ/CPF)</label>
                    <PremiumInput
                        name="cnpj"
                        value={form.cnpj}
                        onChange={e => setForm(p => ({ ...p, cnpj: e.target.value }))}
                        icon={<Hash className="w-4 h-4" />}
                        placeholder="00.000.000/0001-00"
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-3 ml-2 italic">E-mail para Recibos</label>
                    <PremiumInput
                        name="email"
                        value={form.email}
                        onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                        icon={<Mail className="w-4 h-4" />}
                        placeholder="corporativo@nexus.com"
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-3 ml-2 italic">Contato Oficial</label>
                    <PremiumInput
                        name="phone"
                        value={form.phone}
                        onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                        icon={<Phone className="w-4 h-4" />}
                        placeholder="+55 (00) 00000-0000"
                    />
                </div>

                <div className="sm:col-span-1">
                    <label className="block text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-3 ml-2 italic">Endereço Principal</label>
                    <PremiumInput
                        name="address"
                        value={form.address}
                        onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                        icon={<MapPin className="w-4 h-4" />}
                        placeholder="Rua das Inovações, 1000"
                    />
                </div>

                <div className="grid grid-cols-3 sm:col-span-2 gap-6">
                    <div className="col-span-1">
                        <label className="block text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-3 ml-1">Cidade</label>
                        <PremiumInput
                            name="city"
                            value={form.city}
                            onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                        />
                    </div>
                    <div className="col-span-1">
                        <label className="block text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-3 ml-1">Estado</label>
                        <PremiumInput
                            name="state"
                            value={form.state}
                            onChange={e => setForm(p => ({ ...p, state: e.target.value }))}
                        />
                    </div>
                    <div className="col-span-1">
                        <label className="block text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-3 ml-1">CEP</label>
                        <PremiumInput
                            name="zip_code"
                            value={form.zip_code}
                            onChange={e => setForm(p => ({ ...p, zip_code: e.target.value }))}
                        />
                    </div>
                </div>

                <div className="sm:col-span-2">
                    <div className="flex items-center gap-2 mb-3 ml-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
                        <label className="block text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] font-black italic">Políticas de Garantia & Termos de Uso</label>
                    </div>
                    <PremiumTextarea
                        name="warranty_terms"
                        value={form.warranty_terms}
                        onChange={e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))}
                        rows={8}
                        placeholder="Defina as cláusulas contratuais de garantia e suporte..."
                        className="min-h-[250px] bg-white/5 border-white/5 focus:border-rose-500/30 text-base leading-relaxed p-8"
                    />
                    <div className="mt-4 flex items-center gap-3 p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10">
                        <Sparkles className="w-4 h-4 text-rose-500/40" />
                        <p className="text-[10px] text-muted-foreground/40 font-bold uppercase tracking-widest leading-none">
                            Essas cláusulas serão impressas automaticamente em todos os comprovantes de entrada.
                        </p>
                    </div>
                </div>
            </div>

            <div className="pt-10 border-t border-white/5 flex items-center justify-between gap-6">
                <div className="hidden lg:block">
                    <p className="text-[10px] font-black text-muted-foreground/20 uppercase tracking-[0.4em]">Autenticado via Nexus Matrix</p>
                </div>
                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full lg:w-auto flex items-center justify-center gap-4 bg-primary text-primary-foreground h-16 px-12 rounded-[2rem] text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                    {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                        <>
                            <Save className="w-5 h-5" />
                            IMPLEMENTAR ALTERAÇÕES
                        </>
                    )}
                </button>
            </div>
        </form>
    )
}

