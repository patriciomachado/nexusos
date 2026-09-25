import { cn } from '@/lib/utils'

/**
 * Money for big figures: "R$" and the cents in a smaller size, so the reais
 * stay large and the whole value fits (R$ 4.548,60 → R$ **4.548**,60).
 */
export default function Money({ value, className }: { value: number | null | undefined; className?: string }) {
    if (value == null) return <span className={className}>—</span>
    const negative = value < 0
    const [reais, cents] = Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).split(',')
    return (
        <span className={cn('whitespace-nowrap', reais.length > 7 && 'text-[0.8em]', className)} aria-label={value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}>
            <span className="text-[0.55em] font-medium text-muted-foreground mr-[0.2em] align-[0.35em]">{negative ? '− R$' : 'R$'}</span>
            <span>{reais}</span>
            <span className="text-[0.6em] font-semibold">,{cents}</span>
        </span>
    )
}
