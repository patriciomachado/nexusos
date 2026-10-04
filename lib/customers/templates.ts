export interface Automations {
    birthday: boolean
    birthday_text: string
    review: boolean
    review_days: number
    review_text: string
    appointment_reminder: boolean
    appointment_text: string
    /** Botão "Enviar OS" na tela da ordem: texto que vai pronto para o chat. */
    os_tracking_text: string
    /** Aviso automático de "aparelho pronto" quando a OS é concluída. */
    os_ready: boolean
    os_ready_text: string
    /** A Alice pode abrir/mudar OS e criar orçamentos (sempre com confirmação). */
    alice_os: boolean
    alice_quotes: boolean
}

export const DEFAULT_AUTOMATIONS: Automations = {
    birthday: false,
    birthday_text: 'Feliz aniversário, {nome}! 🎉 A equipe da {loja} deseja um ano incrível. Passando aqui para lembrar que você tem 10% de desconto em película e capinha este mês.',
    review: false,
    review_days: 2,
    review_text: 'Oi, {nome}! Tudo certo com o seu {aparelho}? Se puder, conta pra gente como foi o atendimento da {loja} no Google, ajuda muito: {link}',
    appointment_reminder: false,
    appointment_text: 'Olá, {nome}! Passando para lembrar do seu horário na {loja}: {data} às {hora}.{servico} Se precisar remarcar, é só responder aqui.',
    os_tracking_text: 'Olá {nome}! Acompanhe sua OS {os} por aqui: {link}',
    os_ready: true,
    os_ready_text: 'Olá, {nome}! Boa notícia: seu {aparelho} (OS {os}) está pronto. ✅\n{valor}Pode retirar na {loja}{endereco} no nosso horário de atendimento.\nDetalhes: {link}',
    alice_os: true,
    alice_quotes: true,
}

const text = (v: unknown, fallback: string) => (typeof v === 'string' && v.trim() ? v.slice(0, 800) : fallback)

export function normalizeAutomations(raw: unknown): Automations {
    const r = (raw ?? {}) as Partial<Automations>
    const d = DEFAULT_AUTOMATIONS
    return {
        birthday: !!r.birthday,
        birthday_text: text(r.birthday_text, d.birthday_text),
        review: !!r.review,
        review_days: Math.min(Math.max(Math.round(Number(r.review_days) || 2), 1), 30),
        review_text: text(r.review_text, d.review_text),
        appointment_reminder: !!r.appointment_reminder,
        appointment_text: text(r.appointment_text, d.appointment_text),
        os_tracking_text: text(r.os_tracking_text, d.os_tracking_text),
        os_ready: r.os_ready === undefined ? d.os_ready : !!r.os_ready,
        os_ready_text: text(r.os_ready_text, d.os_ready_text),
        alice_os: r.alice_os === undefined ? d.alice_os : !!r.alice_os,
        alice_quotes: r.alice_quotes === undefined ? d.alice_quotes : !!r.alice_quotes,
    }
}

/** Replaces {variavel} in a template; unknown variables stay as typed. */
export function fill(text: string, vars: Record<string, string>) {
    return text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m))
}

