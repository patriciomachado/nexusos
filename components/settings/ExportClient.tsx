'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Banknote, Boxes, ClipboardList, Database, Loader2, Receipt, ShoppingBag, Smartphone, Users, Wallet, type LucideIcon } from 'lucide-react'
import { Chips, Group } from '@/components/ui/form'
import { cn } from '@/lib/utils'

type Kind = 'clientes' | 'os' | 'vendas' | 'estoque' | 'aparelhos' | 'financeiro' | 'caixa' | 'contas' | 'backup'
type Period = 'all' | 'month' | 'last' | 'year'

const AREAS: { kind: Kind; label: string; detail: string; icon: LucideIcon; color: string; dated?: boolean }[] = [
    { kind: 'clientes', label: 'Clientes', detail: 'Contatos, documentos, aniversário e etiquetas', icon: Users, color: 'bg-sky-500' },
    { kind: 'os', label: 'Ordens de serviço', detail: 'Aparelho, defeito, técnico e valores', icon: ClipboardList, color: 'bg-blue-500', dated: true },
    { kind: 'vendas', label: 'Vendas do PDV', detail: 'Itens, vendedor, desconto e custo', icon: ShoppingBag, color: 'bg-emerald-500', dated: true },
    { kind: 'financeiro', label: 'Recebimentos', detail: 'Tudo que entrou, por forma de pagamento', icon: Receipt, color: 'bg-green-600', dated: true },
    { kind: 'caixa', label: 'Movimentos do caixa', detail: 'Entradas, sangrias e suprimentos', icon: Wallet, color: 'bg-teal-600', dated: true },
    { kind: 'contas', label: 'Contas a pagar', detail: 'Vencimentos, pagas e em aberto', icon: Banknote, color: 'bg-orange-500' },
    { kind: 'estoque', label: 'Estoque', detail: 'Produtos, custo, preço e quantidade', icon: Boxes, color: 'bg-amber-500' },
    { kind: 'aparelhos', label: 'Aparelhos', detail: 'Compra, venda, lucro e garantia', icon: Smartphone, color: 'bg-violet-500' },
]

function range(p: Period): { from?: string; to?: string } {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
    const [y, m] = today.split('-').map(Number)
    const pad = (n: number) => String(n).padStart(2, '0')
    if (p === 'month') return { from: `${y}-${pad(m)}-01`, to: today }
    if (p === 'year') return { from: `${y}-01-01`, to: today }
    if (p === 'last') {
        const ly = m === 1 ? y - 1 : y
        const lm = m === 1 ? 12 : m - 1
        const lastDay = new Date(Date.UTC(ly, lm, 0)).getUTCDate()
        return { from: `${ly}-${pad(lm)}-01`, to: `${ly}-${pad(lm)}-${pad(lastDay)}` }
    }
    return {}
}

/** Saves a downloaded file: share sheet on the phone ("Salvar em Arquivos"), normal download elsewhere. */
async function saveFile(blob: Blob, name: string) {
    const file = new File([blob], name, { type: blob.type })
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean }
    if (/iPhone|iPad|Android/i.test(navigator.userAgent) && nav.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], title: name }); return } catch (e) { if ((e as Error).name === 'AbortError') return }
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export default function ExportClient({ owner }: { owner: boolean }) {
    const [period, setPeriod] = useState<Period>('month')
    const [busy, setBusy] = useState<Kind | null>(null)

    const run = async (kind: Kind, dated?: boolean) => {
        setBusy(kind)
        try {
            const q = new URLSearchParams({ kind, ...(dated ? range(period) : {}) })
            const res = await fetch(`/api/export?${q}`)
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Não foi possível exportar')
            const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? `${kind}.csv`
            await saveFile(await res.blob(), name)
        } catch (e) {
            toast.error((e as Error).message)
        } finally {
            setBusy(null)
        }
    }

    const Row = ({ kind, label, detail, icon: Icon, color, dated }: typeof AREAS[number]) => (
        <button type="button" onClick={() => run(kind, dated)} disabled={!!busy} className="w-full flex items-center gap-3 px-3 min-h-[56px] py-2 text-left hover:bg-foreground/[0.02] active:bg-foreground/[0.05] disabled:opacity-60">
            <span className={cn('w-[30px] h-[30px] rounded-[8px] flex items-center justify-center text-white shrink-0', color)}><Icon className="w-[18px] h-[18px]" /></span>
            <span className="flex-1 min-w-0">
                <span className="block text-[17px]">{label}</span>
                <span className="block text-[13px] text-muted-foreground truncate">{detail}</span>
            </span>
            {busy === kind ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <span className="text-[15px] text-primary font-medium">Baixar</span>}
        </button>
    )

    return (
        <div className="space-y-6">
            <Group title="Período" footer="Vale para OS, vendas, recebimentos e caixa. Clientes, estoque, aparelhos e contas saem completos.">
                <div className="px-4 py-3">
                    <Chips ariaLabel="Período" value={period} onChange={setPeriod} options={[
                        { value: 'month', label: 'Este mês' }, { value: 'last', label: 'Mês passado' }, { value: 'year', label: 'Este ano' }, { value: 'all', label: 'Tudo' },
                    ]} />
                </div>
            </Group>

            <Group title="Planilhas (abre no Excel e no Google Planilhas)">
                {AREAS.map(a => <Row key={a.kind} {...a} />)}
            </Group>

            {owner && (
                <Group title="Backup completo" footer="Um arquivo com todos os dados da loja (clientes, OS, vendas, estoque, financeiro, equipe). Guarde no Google Drive ou no computador. Senhas e chaves do WhatsApp não entram.">
                    <Row kind="backup" label="Baixar backup" detail="Arquivo .json com tudo" icon={Database} color="bg-zinc-600" />
                </Group>
            )}
        </div>
    )
}
