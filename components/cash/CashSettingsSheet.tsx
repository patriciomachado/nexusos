'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import Sheet from '@/components/tasks/Sheet'
import { Field, Group, PrimaryButton, TextInput, brl, parseMoney } from '@/components/ui/form'
import { send } from './CashSheets'
import type { CashSettingsView, FeeRule } from './cash-utils'

type FeeKey = 'debit' | 'credit' | 'pix'
const FEES: { key: FeeKey; label: string; hint: string }[] = [
    { key: 'debit', label: 'Débito', hint: 'Ex.: 1,5% · cai em 1 dia' },
    { key: 'credit', label: 'Crédito', hint: 'Ex.: 3,2% · cai em 30 dias' },
    { key: 'pix', label: 'Pix', hint: 'Normalmente 0% · na hora' },
]

const pct = (v: string) => Math.min(Math.max(Number(v.replace(',', '.')) || 0, 0), 30)
const txt = (n: number) => (n ? String(n).replace('.', ',') : '')

/**
 * Owner settings for the register: card machine fees and when the money
 * lands, the withdrawal limit with the owner PIN, and where the closing
 * report goes on WhatsApp.
 */
export default function CashSettingsSheet({ open, onClose, settings, onSaved }: { open: boolean; onClose: () => void; settings: CashSettingsView | null; onSaved: () => void }) {
    const [fees, setFees] = useState<Record<FeeKey, { rate: string; days: string }>>({ debit: { rate: '', days: '1' }, credit: { rate: '', days: '30' }, pix: { rate: '', days: '0' } })
    const [limit, setLimit] = useState('')
    const [maxDiscount, setMaxDiscount] = useState('')
    const [pin, setPin] = useState('')
    const [removePin, setRemovePin] = useState(false)
    const [phone, setPhone] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!open || !settings) return
        const f = (r: FeeRule) => ({ rate: txt(r.rate), days: String(r.days) })
        setFees({ debit: f(settings.fees.debit), credit: f(settings.fees.credit), pix: f(settings.fees.pix) })
        setLimit(settings.sangria_limit ? String(settings.sangria_limit).replace('.', ',') : '')
        setMaxDiscount(settings.max_discount_pct ? String(settings.max_discount_pct).replace('.', ',') : '')
        setPin('')
        setRemovePin(false)
        setPhone(settings.report_phone ?? '')
    }, [open, settings])

    const save = async () => {
        if (pin && !/^\d{4,6}$/.test(pin)) return toast.error('A senha deve ter de 4 a 6 números.')
        const limitValue = parseMoney(limit)
        if ((limitValue > 0 || pct(maxDiscount) > 0) && !settings?.has_pin && !pin) return toast.error('Crie a senha do dono para autorizar o que passar do limite.')
        setSaving(true)
        try {
            const rule = (k: FeeKey) => ({ rate: pct(fees[k].rate), days: Math.max(0, Math.round(Number(fees[k].days) || 0)) })
            await send('/api/cash-settings', 'PUT', {
                fees: { debit: rule('debit'), credit: rule('credit'), credit_installments: rule('credit'), pix: rule('pix') },
                sangria_limit: limitValue,
                max_discount_pct: pct(maxDiscount) || 0,
                report_phone: phone.trim() || null,
                ...(pin ? { pin } : removePin ? { pin: null } : {}),
            })
            toast.success('Ajustes do caixa salvos')
            onSaved()
            onClose()
        } catch (e) {
            toast.error((e as Error).message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <Sheet
            open={open}
            onClose={onClose}
            title="Ajustes do caixa"
            size="lg"
            footer={<PrimaryButton className="w-full" onClick={save} disabled={saving}>{saving && <Loader2 className="w-5 h-5 animate-spin" />}Salvar</PrimaryButton>}
        >
            <div className="space-y-6">
                <div tabIndex={-1} data-autofocus className="outline-none" aria-hidden />
                <Group title="Taxas da maquininha" footer="Usadas para mostrar quanto cai de verdade na conta e quando. Entram como despesa nos relatórios.">
                    {FEES.map(f => (
                        <div key={f.key} className="px-4 py-3">
                            <p className="text-[17px]">{f.label}</p>
                            <div className="mt-1 grid grid-cols-2 gap-3">
                                <label className="flex items-center gap-2 rounded-xl bg-foreground/[0.05] px-3 h-11">
                                    <input
                                        inputMode="decimal"
                                        value={fees[f.key].rate}
                                        onChange={e => setFees(v => ({ ...v, [f.key]: { ...v[f.key], rate: e.target.value.replace(/[^\d.,]/g, '') } }))}
                                        placeholder="0"
                                        aria-label={`Taxa ${f.label} (%)`}
                                        className="w-full min-w-0 bg-transparent text-[17px] outline-none tabular-nums"
                                    />
                                    <span className="text-[15px] text-muted-foreground">%</span>
                                </label>
                                <label className="flex items-center gap-2 rounded-xl bg-foreground/[0.05] px-3 h-11">
                                    <span className="text-[15px] text-muted-foreground shrink-0">cai em</span>
                                    <input
                                        inputMode="numeric"
                                        value={fees[f.key].days}
                                        onChange={e => setFees(v => ({ ...v, [f.key]: { ...v[f.key], days: e.target.value.replace(/\D/g, '') } }))}
                                        aria-label={`Dias para cair (${f.label})`}
                                        className="w-full min-w-0 bg-transparent text-[17px] outline-none tabular-nums"
                                    />
                                    <span className="text-[15px] text-muted-foreground">dias</span>
                                </label>
                            </div>
                            <p className="mt-1 text-[12px] text-muted-foreground">{f.hint}</p>
                        </div>
                    ))}
                </Group>

                <Group title="Sangria e desconto" footer={parseMoney(limit) > 0 ? `Funcionários precisam da senha do dono para tirar mais de ${brl(parseMoney(limit))} do caixa.` : 'Sem limite: qualquer um que abre o caixa pode fazer sangria.'}>
                    <Field label="Limite sem autorização (R$)" htmlFor="cs-limit">
                        <TextInput id="cs-limit" inputMode="decimal" value={limit} onChange={e => setLimit(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="Sem limite" />
                    </Field>
                    <Field label="Desconto máximo no PDV sem autorização (%)" htmlFor="cs-disc">
                        <TextInput id="cs-disc" inputMode="decimal" value={maxDiscount} onChange={e => setMaxDiscount(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="Sem limite" />
                    </Field>
                    <Field label={settings?.has_pin ? 'Nova senha do dono (deixe em branco para manter)' : 'Senha do dono (4 a 6 números)'} htmlFor="cs-pin">
                        <TextInput id="cs-pin" type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} placeholder="••••" />
                    </Field>
                    {settings?.has_pin && (
                        <label className="flex items-center gap-3 px-4 min-h-[48px]">
                            <input type="checkbox" checked={removePin} onChange={e => setRemovePin(e.target.checked)} className="w-5 h-5 accent-red-600" />
                            <span className="text-[15px]">Apagar a senha atual</span>
                        </label>
                    )}
                </Group>

                <Group
                    title="Relatório de fechamento"
                    footer={settings?.whatsapp_ready
                        ? 'Ao fechar um caixa, o resumo vai para este WhatsApp, enviado pelo número da loja (Alice).'
                        : 'Conecte o WhatsApp da loja em Alice → Configurações para o envio automático. Enquanto isso, o relatório pode ser compartilhado na hora do fechamento.'}
                >
                    <Field label="Enviar para o WhatsApp" htmlFor="cs-phone">
                        <TextInput id="cs-phone" type="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 98888-7777" />
                    </Field>
                </Group>
            </div>
        </Sheet>
    )
}
