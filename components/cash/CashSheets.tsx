'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, Loader2, Trash2 } from 'lucide-react'
import Sheet from '@/components/tasks/Sheet'
import { Chips, Field, Group, PrimaryButton, SecondaryButton, TextArea, TextInput, brl, moneyText, parseMoney } from '@/components/ui/form'
import { cn } from '@/lib/utils'
import { type CashTx, cleanDescription, methodName, num, sourceLabel, timeOf } from './cash-utils'

/** Big money field ("R$ 0,00") with the numeric keypad on phones. */
function MoneyField({ value, onChange, autoFocus, label }: { value: string; onChange: (v: string) => void; autoFocus?: boolean; label: string }) {
    return (
        <label className="block rounded-2xl bg-foreground/[0.04] px-4 py-3">
            <span className="block text-[13px] text-muted-foreground">{label}</span>
            <span className="flex items-baseline gap-2">
                <span className="text-[22px] font-semibold text-muted-foreground">R$</span>
                <input
                    inputMode="decimal"
                    enterKeyHint="done"
                    value={value}
                    onChange={e => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
                    placeholder="0,00"
                    data-autofocus={autoFocus || undefined}
                    className="money-input w-full min-w-0 bg-transparent text-[34px] leading-tight font-semibold tracking-tight tabular-nums outline-none placeholder:text-muted-foreground/40"
                />
            </span>
        </label>
    )
}

async function send(url: string, method: string, body?: unknown) {
    const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Não foi possível salvar.')
    return data
}

/* ───────────────────────── Abrir caixa ───────────────────────── */

export function OpenCashSheet({ open, onClose, onDone, suggested }: { open: boolean; onClose: () => void; onDone: () => void; suggested?: number | null }) {
    const [value, setValue] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
         
        if (open) setValue(suggested ? moneyText(suggested) : '')
    }, [open, suggested])

    const submit = async () => {
        setSaving(true)
        try {
            await send('/api/cash-registers/open', 'POST', { opening_balance: parseMoney(value) })
            toast.success('Caixa aberto')
            onDone()
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
            title="Abrir caixa"
            subtitle="Quanto tem de dinheiro na gaveta agora?"
            footer={<PrimaryButton className="w-full" onClick={submit} disabled={saving}>{saving && <Loader2 className="w-5 h-5 animate-spin" />}Abrir caixa</PrimaryButton>}
        >
            <div className="space-y-3">
                <MoneyField label="Troco inicial" value={value} onChange={setValue} autoFocus />
                {suggested != null && suggested > 0 && (
                    <p className="px-1 text-[13px] text-muted-foreground">Sugerido: o que ficou no último fechamento ({brl(suggested)}).</p>
                )}
                <p className="px-1 text-[13px] text-muted-foreground">Pode deixar em branco se a gaveta está vazia.</p>
            </div>
        </Sheet>
    )
}

/* ───────────────────── Suprimento / Sangria ───────────────────── */

type Method = { id: string; name: string; code: string }

const REASONS: Record<'entry' | 'exit', string[]> = {
    entry: ['Troco', 'Aporte do dono', 'Devolução', 'Outro'],
    exit: ['Depósito no banco', 'Pagamento de fornecedor', 'Retirada do dono', 'Despesa da loja', 'Outro'],
}

export function MovementSheet({ open, onClose, onDone, type, registerId }: { open: boolean; onClose: () => void; onDone: () => void; type: 'entry' | 'exit'; registerId: string }) {
    const [value, setValue] = useState('')
    const [reason, setReason] = useState('')
    const [note, setNote] = useState('')
    const [methodId, setMethodId] = useState('')
    const [methods, setMethods] = useState<Method[]>([])
    const [saving, setSaving] = useState(false)
    const isEntry = type === 'entry'

    useEffect(() => {
        if (!open) return
         
        setValue(''); setReason(''); setNote('')
        fetch('/api/payment-methods').then(r => r.json()).then((data: Method[]) => {
            if (!Array.isArray(data)) return
            const order = ['CASH', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD']
            const rank = (m: Method) => { const i = order.indexOf(m.code); return i < 0 ? 99 : i }
            setMethods([...data].sort((a, b) => rank(a) - rank(b)))
            setMethodId(data.find(m => m.code === 'CASH')?.id ?? data[0]?.id ?? '')
        }).catch(() => {})
    }, [open])

    const submit = async () => {
        const amount = parseMoney(value)
        if (amount <= 0) return toast.error('Informe o valor.')
        if (!reason) return toast.error('Escolha o motivo.')
        if (reason === 'Outro' && !note.trim()) return toast.error('Conte o motivo em poucas palavras.')
        const justification = [reason === 'Outro' ? null : reason, note.trim() || null].filter(Boolean).join(' · ')
        setSaving(true)
        try {
            await send('/api/cash-transactions', 'POST', {
                cash_register_id: registerId,
                type,
                amount,
                payment_method_id: methodId,
                description: `${isEntry ? 'Suprimento' : 'Sangria'}: ${reason === 'Outro' ? note.trim() : reason}`,
                source_type: isEntry ? 'manual_suprimento' : 'manual_sangria',
                justification,
            })
            toast.success(isEntry ? 'Suprimento registrado' : 'Sangria registrada')
            onDone()
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
            title={isEntry ? 'Suprimento' : 'Sangria'}
            subtitle={isEntry ? 'Dinheiro que entra no caixa sem ser venda' : 'Dinheiro que sai do caixa'}
            footer={
                <PrimaryButton
                    className={cn('w-full', isEntry ? 'bg-emerald-600' : 'bg-red-600')}
                    onClick={submit}
                    disabled={saving}
                >
                    {saving && <Loader2 className="w-5 h-5 animate-spin" />}
                    {isEntry ? 'Registrar suprimento' : 'Registrar sangria'}
                </PrimaryButton>
            }
        >
            <div className="space-y-5">
                <MoneyField label="Valor" value={value} onChange={setValue} autoFocus />
                <div className="space-y-2">
                    <p className="px-1 text-[13px] text-muted-foreground">Motivo</p>
                    <Chips ariaLabel="Motivo" options={REASONS[type].map(r => ({ value: r, label: r }))} value={reason} onChange={setReason} />
                </div>
                {methods.length > 1 && (
                    <div className="space-y-2">
                        <p className="px-1 text-[13px] text-muted-foreground">Forma</p>
                        <Chips ariaLabel="Forma" options={methods.map(m => ({ value: m.id, label: m.name }))} value={methodId} onChange={setMethodId} />
                    </div>
                )}
                <Group>
                    <Field label={reason === 'Outro' ? 'Motivo' : 'Observação (opcional)'} htmlFor="mv-note">
                        <TextArea id="mv-note" rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder={isEntry ? 'Ex.: troco do banco' : 'Ex.: pago ao motoboy'} />
                    </Field>
                </Group>
            </div>
        </Sheet>
    )
}

/* ───────────────────────── Fechar caixa ───────────────────────── */

export function CloseCashSheet({ open, onClose, onDone, registerId, opening, entries, exits, balance, drawer }: {
    open: boolean
    onClose: () => void
    onDone: () => void
    registerId: string
    opening: number
    entries: number
    exits: number
    balance: number
    drawer: number
}) {
    const [counted, setCounted] = useState('')
    const [saving, setSaving] = useState(false)
    const [done, setDone] = useState(false)

    useEffect(() => {
         
        if (open) { setCounted(''); setDone(false) }
    }, [open])

    const diff = counted.trim() ? parseMoney(counted) - drawer : null

    const submit = async () => {
        setSaving(true)
        try {
            await send(`/api/cash-registers/${registerId}/close`, 'POST')
            setDone(true)
        } catch (e) {
            toast.error((e as Error).message)
        } finally {
            setSaving(false)
        }
    }

    if (done) {
        // Reload only now: the screen behind swaps to "caixa fechado" and this sheet goes away.
        const finish = () => { onClose(); onDone() }
        return (
            <Sheet open={open} onClose={finish} title="Caixa fechado" footer={<PrimaryButton className="w-full" onClick={finish}>OK</PrimaryButton>}>
                <div className="py-6 flex flex-col items-center text-center gap-3">
                    <CheckCircle2 className="w-14 h-14 text-emerald-500" />
                    <p className="text-[17px]">Fechado com saldo de <strong className="tabular-nums">{brl(balance)}</strong>.</p>
                    {diff != null && Math.abs(diff) >= 0.01 && (
                        <p className="text-[15px] text-muted-foreground">Na contagem, {diff > 0 ? 'sobraram' : 'faltaram'} <strong className="text-foreground tabular-nums">{brl(Math.abs(diff))}</strong> em dinheiro.</p>
                    )}
                    <p className="text-[13px] text-muted-foreground">O fechamento fica no Histórico.</p>
                </div>
            </Sheet>
        )
    }

    return (
        <Sheet
            open={open}
            onClose={onClose}
            title="Fechar caixa"
            subtitle="Confira o dinheiro da gaveta antes de fechar"
            footer={
                <>
                    <SecondaryButton onClick={onClose} disabled={saving}>Voltar</SecondaryButton>
                    <PrimaryButton className="flex-1" onClick={submit} disabled={saving}>{saving && <Loader2 className="w-5 h-5 animate-spin" />}Fechar caixa</PrimaryButton>
                </>
            }
        >
            <div className="space-y-5">
                <Group>
                    <Line label="Abertura" value={brl(opening)} />
                    <Line label="Entradas" value={`+ ${brl(entries)}`} tone="in" />
                    <Line label="Saídas" value={`− ${brl(exits)}`} tone="out" />
                    <Line label="Saldo do caixa" value={brl(balance)} strong />
                </Group>

                <div className="space-y-2">
                    <MoneyField label="Dinheiro contado na gaveta (opcional)" value={counted} onChange={setCounted} />
                    <p className="px-1 text-[13px] text-muted-foreground">Esperado em dinheiro: <span className="text-foreground font-medium tabular-nums">{brl(drawer)}</span>. Pix e cartão não entram na contagem.</p>
                </div>

                {diff != null && (
                    <div className={cn(
                        'rounded-2xl px-4 py-3 flex items-center justify-between text-[15px] font-medium',
                        Math.abs(diff) < 0.01 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            : diff > 0 ? 'bg-sky-500/10 text-sky-700 dark:text-sky-400'
                                : 'bg-red-500/10 text-red-700 dark:text-red-400'
                    )}>
                        <span>{Math.abs(diff) < 0.01 ? 'Bateu certinho' : diff > 0 ? 'Sobrando' : 'Faltando'}</span>
                        <span className="tabular-nums">{Math.abs(diff) < 0.01 ? '✓' : brl(Math.abs(diff))}</span>
                    </div>
                )}

                <p className="px-1 text-[13px] text-muted-foreground">Depois de fechado, novas vendas e movimentações vão para o próximo caixa.</p>
            </div>
        </Sheet>
    )
}

function Line({ label, value, tone, strong }: { label: string; value: string; tone?: 'in' | 'out'; strong?: boolean }) {
    return (
        <div className="flex items-center justify-between gap-3 px-4 min-h-[48px]">
            <span className={cn('text-[17px]', strong ? 'font-semibold' : 'text-foreground')}>{label}</span>
            <span className={cn(
                'text-[17px] tabular-nums',
                strong && 'font-semibold',
                tone === 'in' && 'text-emerald-700 dark:text-emerald-400',
                tone === 'out' && 'text-red-600 dark:text-red-400',
            )}>{value}</span>
        </div>
    )
}

/* ─────────────────── Detalhe de uma movimentação ─────────────────── */

export function TransactionSheet({ tx, onClose, onDone, editable }: { tx: CashTx | null; onClose: () => void; onDone: () => void; editable: boolean }) {
    const [description, setDescription] = useState('')
    const [value, setValue] = useState('')
    const [saving, setSaving] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)

    useEffect(() => {
        if (!tx) return
         
        setDescription(tx.description || '')
        setValue(moneyText(num(tx.amount)))
        setConfirmDelete(false)
    }, [tx])

    if (!tx) return null
    const manual = tx.source_type === 'manual_sangria' || tx.source_type === 'manual_suprimento' || !tx.source_type

    const save = async () => {
        const amount = parseMoney(value)
        if (amount <= 0) return toast.error('Informe o valor.')
        setSaving(true)
        try {
            await send(`/api/cash-transactions?id=${tx.id}`, 'PUT', { description, amount })
            toast.success('Movimentação atualizada')
            onDone()
            onClose()
        } catch (e) {
            toast.error((e as Error).message)
        } finally {
            setSaving(false)
        }
    }

    const remove = async () => {
        setSaving(true)
        try {
            await send(`/api/cash-transactions?id=${tx.id}`, 'DELETE')
            toast.success('Movimentação removida')
            onDone()
            onClose()
        } catch (e) {
            toast.error((e as Error).message)
        } finally {
            setSaving(false)
        }
    }

    const entry = tx.type === 'entry'

    return (
        <Sheet
            open
            onClose={onClose}
            title={cleanDescription(tx)}
            subtitle={`${sourceLabel(tx)} · ${new Date(tx.created_at).toLocaleDateString('pt-BR')} às ${timeOf(tx.created_at)}`}
            footer={editable ? (
                confirmDelete ? (
                    <>
                        <SecondaryButton onClick={() => setConfirmDelete(false)} disabled={saving}>Cancelar</SecondaryButton>
                        <PrimaryButton className="flex-1 bg-red-600" onClick={remove} disabled={saving}>{saving && <Loader2 className="w-5 h-5 animate-spin" />}Apagar de vez</PrimaryButton>
                    </>
                ) : (
                    <>
                        <SecondaryButton onClick={() => setConfirmDelete(true)} aria-label="Apagar" className="text-red-600 dark:text-red-400"><Trash2 className="w-5 h-5" /></SecondaryButton>
                        {manual && <PrimaryButton className="flex-1" onClick={save} disabled={saving}>{saving && <Loader2 className="w-5 h-5 animate-spin" />}Salvar</PrimaryButton>}
                    </>
                )
            ) : undefined}
        >
            <div className="space-y-4">
                <p className={cn('text-[34px] font-semibold tracking-tight tabular-nums', entry ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                    {entry ? '+' : '−'} {brl(num(tx.amount))}
                </p>
                <Group>
                    <Line label="Forma" value={methodName(tx)} />
                    <Line label="Tipo" value={sourceLabel(tx)} />
                    {tx.justification && (
                        <div className="px-4 py-3">
                            <p className="text-[13px] text-muted-foreground">Motivo</p>
                            <p className="text-[17px]">{tx.justification}</p>
                        </div>
                    )}
                </Group>

                {editable && manual && (
                    <Group title="Corrigir">
                        <Field label="Descrição" htmlFor="tx-desc">
                            <TextInput id="tx-desc" value={description} onChange={e => setDescription(e.target.value)} />
                        </Field>
                        <Field label="Valor (R$)" htmlFor="tx-amount">
                            <TextInput id="tx-amount" inputMode="decimal" value={value} onChange={e => setValue(e.target.value.replace(/[^\d.,]/g, ''))} />
                        </Field>
                    </Group>
                )}
                {editable && !manual && (
                    <p className="px-1 text-[13px] text-muted-foreground">Veio de uma {tx.source_type === 'product_sale' ? 'venda' : 'OS'}. Para mudar o valor, corrija por lá.</p>
                )}
                {confirmDelete && (
                    <p className="px-1 text-[15px] text-red-600 dark:text-red-400">Apagar esta movimentação muda o saldo do caixa. Não dá para desfazer.</p>
                )}
            </div>
        </Sheet>
    )
}
