'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Check, Loader2, Plus, Store } from 'lucide-react'
import Sheet from '@/components/tasks/Sheet'
import UpgradeCard from '@/components/plans/UpgradeCard'
import { Field, Group, PrimaryButton, SwitchRow, TextInput, brl } from '@/components/ui/form'

interface StoreRow { id: string; name: string; city: string | null; logo_url: string | null; parent_company_id: string | null; role: string; current: boolean; revenue: number | null; open_os: number | null }
interface Data { stores: StoreRow[]; can_create: boolean; has_feature: boolean }

const ROLE: Record<string, string> = { admin: 'Dono', owner: 'Dono', manager: 'Gerente', technician: 'Técnico', attendant: 'Atendente', cashier: 'Caixa', talento: 'Talento' }

/** Head office and branches: switch store, compare the month and open a new branch. */
export default function StoresClient() {
    const [data, setData] = useState<Data | null>(null)
    const [switching, setSwitching] = useState<string | null>(null)
    const [creating, setCreating] = useState(false)

    const load = useCallback(() => {
        fetch('/api/stores').then(r => r.json()).then(setData).catch(() => toast.error('Não foi possível carregar as lojas'))
    }, [])
    useEffect(load, [load])

    const switchTo = async (s: StoreRow) => {
        if (s.current) return
        setSwitching(s.id)
        const res = await fetch('/api/stores/switch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company_id: s.id }) })
        if (!res.ok) {
            setSwitching(null)
            return toast.error((await res.json().catch(() => ({}))).error || 'Não foi possível trocar de loja')
        }
        // Full reload so every screen and cache starts from the new store.
        window.location.replace(new URL('/dashboard', window.location.origin))
    }

    if (!data) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>

    const managed = data.stores.filter(s => s.revenue !== null)
    const total = managed.reduce((a, s) => a + (s.revenue ?? 0), 0)

    return (
        <div className="space-y-6">
            {managed.length > 1 && (
                <section className="rounded-2xl bg-card border border-border/60 p-4">
                    <p className="text-[13px] text-muted-foreground">Recebido este mês, todas as lojas</p>
                    <p className="text-[28px] font-semibold tabular-nums">{brl(total)}</p>
                    <div className="mt-3 space-y-2">
                        {managed.map(s => (
                            <div key={s.id}>
                                <div className="flex justify-between text-[14px]"><span className="truncate">{s.name}</span><span className="tabular-nums text-muted-foreground">{brl(s.revenue ?? 0)}</span></div>
                                <div className="h-1.5 rounded-full bg-foreground/[0.06] overflow-hidden mt-1">
                                    <div className="h-full rounded-full bg-primary" style={{ width: `${total > 0 ? Math.max(2, ((s.revenue ?? 0) / total) * 100) : 0}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <Group title="Suas lojas" footer={data.stores.length > 1 ? 'Toque numa loja para entrar nela. Você pode voltar quando quiser.' : undefined}>
                {data.stores.map(s => (
                    <button key={s.id} type="button" onClick={() => switchTo(s)} disabled={!!switching} className="w-full flex items-center gap-3 px-3 py-2.5 min-h-[60px] text-left hover:bg-foreground/[0.02] disabled:opacity-70">
                        {s.logo_url
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img width={40} height={40} src={s.logo_url} alt="" className="w-10 h-10 rounded-full object-contain bg-white border border-border/60" />
                            : <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center"><Store className="w-5 h-5" /></span>}
                        <span className="flex-1 min-w-0">
                            <span className="block text-[17px] truncate">{s.name}</span>
                            <span className="block text-[13px] text-muted-foreground truncate">
                                {[s.parent_company_id ? 'Filial' : 'Matriz', s.city, ROLE[s.role] ?? s.role, s.open_os !== null ? `${s.open_os} OS em aberto` : null].filter(Boolean).join(' · ')}
                            </span>
                        </span>
                        {switching === s.id ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : s.current ? <span className="inline-flex items-center gap-1 text-[13px] font-medium text-emerald-600"><Check className="w-4 h-4" /> Aqui</span> : <span className="text-[15px] text-primary">Entrar</span>}
                    </button>
                ))}
            </Group>

            {data.can_create && (data.has_feature
                ? <PrimaryButton onClick={() => setCreating(true)} className="w-full"><Plus className="w-5 h-5" /> Abrir filial</PrimaryButton>
                : <UpgradeCard feature="multi_store" compact />)}

            {data.can_create && data.has_feature && (
                <p className="px-4 text-[13px] text-muted-foreground">
                    Cada filial tem seu próprio caixa, estoque, OS e equipe, na mesma assinatura. Para chamar pessoas para a filial, entre nela e use Equipe → Convidar.
                </p>
            )}

            <NewBranchSheet open={creating} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); load() }} />
        </div>
    )
}

function NewBranchSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
    const [name, setName] = useState('')
    const [city, setCity] = useState('')
    const [phone, setPhone] = useState('')
    const [copy, setCopy] = useState(true)
    const [saving, setSaving] = useState(false)

    const create = async () => {
        if (name.trim().length < 2) return toast.error('Informe o nome da filial.')
        setSaving(true)
        try {
            const res = await fetch('/api/stores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), city: city.trim() || null, phone: phone.trim() || null, copy_settings: copy }) })
            const d = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(d.error || 'Não foi possível criar a filial')
            toast.success(`${d.store?.name ?? 'Filial'} criada`)
            setName(''); setCity(''); setPhone('')
            onCreated()
        } catch (e) {
            toast.error((e as Error).message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <Sheet open={open} onClose={onClose} title="Nova filial" footer={<PrimaryButton onClick={create} disabled={saving} className="w-full">{saving && <Loader2 className="w-5 h-5 animate-spin" />}Criar filial</PrimaryButton>}>
            <div className="space-y-5">
                <div tabIndex={-1} data-autofocus />
                <Group>
                    <Field label="Nome da filial" htmlFor="br-name"><TextInput id="br-name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Nexus Cell — Centro" /></Field>
                    <Field label="Cidade" htmlFor="br-city"><TextInput id="br-city" value={city} onChange={e => setCity(e.target.value)} placeholder="opcional" /></Field>
                    <Field label="WhatsApp" htmlFor="br-phone"><TextInput id="br-phone" type="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="opcional" /></Field>
                </Group>
                <Group footer="Leva as formas de pagamento, taxas da maquininha, senha do dono, visual do recibo/OS e permissões. Clientes, estoque e caixa começam vazios.">
                    <SwitchRow label="Copiar ajustes desta loja" checked={copy} onChange={setCopy} />
                </Group>
            </div>
        </Sheet>
    )
}
