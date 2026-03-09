import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value)
}

export function formatDate(date: string | Date | null): string {
    if (!date) return '-'
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR })
}

export function formatDateTime(date: string | Date | null): string {
    if (!date) return '-'
    return format(new Date(date), "dd/MM/yyyy, 'às' HH:mm", { locale: ptBR })
}

export function formatRelative(date: string | Date | null): string {
    if (!date) return '-'
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR })
}

export function formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 11) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
    }
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
    }
    return phone
}

export function formatCPF(cpf: string): string {
    const cleaned = cpf.replace(/\D/g, '')
    if (cleaned.length === 11) {
        return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`
    }
    return cpf
}

export function getInitials(name: string): string {
    if (!name) return '??'
    return name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
}

export const OS_STATUS_LABELS: Record<string, string> = {
    aberta: 'Aberta',
    agendada: 'Agendada',
    em_andamento: 'Em Andamento',
    aguardando_pecas: 'Aguardando Peças',
    concluida: 'Concluída',
    faturada: 'Faturada',
    cancelada: 'Cancelada',
}

export const OS_STATUS_COLORS: Record<string, string> = {
    aberta: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    agendada: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    em_andamento: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    aguardando_pecas: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    concluida: 'bg-green-500/20 text-green-400 border-green-500/30',
    faturada: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    cancelada: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export const OS_PRIORITY_LABELS: Record<string, string> = {
    baixa: 'Baixa',
    normal: 'Normal',
    alta: 'Alta',
    urgente: 'Urgente',
}

export const OS_PRIORITY_COLORS: Record<string, string> = {
    baixa: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    normal: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    alta: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    urgente: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
    dinheiro: 'Dinheiro',
    cartao_credito: 'Cartão de Crédito',
    cartao_debito: 'Cartão de Débito',
    pix: 'PIX',
    boleto: 'Boleto',
    transferencia: 'Transferência',
    crediario: 'Crediário',
}

export const PLAN_LABELS: Record<string, string> = {
    essencial: 'Essencial',
    profissional: 'Profissional',
    avancado: 'Avançado',
}
