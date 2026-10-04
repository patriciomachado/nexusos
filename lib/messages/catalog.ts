/**
 * Mensagens que o app manda pro cliente pelo WhatsApp da loja, por módulo.
 * Cada uma tem um texto editável (com variáveis entre chaves) e, quando faz
 * sentido, a escolha de mandar sozinha ou não. Fica em
 * companies.settings.automations (o mesmo lugar das automações de Clientes),
 * editado em Configurações → Mensagens automáticas.
 *
 * Sem dependência de servidor: a tela de configuração usa esta lista também.
 */

export type MessageModule = 'os' | 'orcamentos' | 'vendas' | 'financeiro' | 'agenda' | 'clientes'

export const MODULE_LABELS: Record<MessageModule, string> = {
    os: 'Ordens de serviço',
    orcamentos: 'Orçamentos',
    vendas: 'Vendas / PDV',
    financeiro: 'Contas a receber',
    agenda: 'Agenda',
    clientes: 'Clientes',
}

export interface MessageEvent {
    key: string
    module: MessageModule
    label: string
    /** Quando sai sozinha (com "Enviar automaticamente" ligado). */
    when: string
    defaultAuto: boolean
    defaultText: string
    vars: string[]
    /**
     * false: não tem envio automático, só o texto é configurável — ele é usado
     * quando alguém da loja manda pelo botão da tela.
     */
    canAuto?: boolean
    /** Ainda guardado nos campos antigos de automations (cron e Agenda leem de lá). */
    legacy?: { auto: 'birthday' | 'review' | 'appointment_reminder'; text: 'birthday_text' | 'review_text' | 'appointment_text' }
}

const OS_VARS = ['nome', 'os', 'aparelho', 'valor', 'link', 'loja', 'endereco']

export const MESSAGE_EVENTS: MessageEvent[] = [
    // ─── Ordens de serviço ───
    {
        key: 'os_aberta', module: 'os', label: 'OS aberta', when: 'Quando uma OS nova é aberta para o cliente.',
        defaultAuto: false, vars: OS_VARS,
        defaultText: 'Olá, {nome}! Recebemos seu {aparelho} aqui na {loja}. Sua ordem de serviço é a {os}.\nAcompanhe por aqui: {link}',
    },
    {
        key: 'os_agendada', module: 'os', label: 'OS agendada', when: 'Quando a OS muda para "Agendada".',
        defaultAuto: false, vars: OS_VARS,
        defaultText: 'Olá, {nome}! Sua {os} ({aparelho}) foi agendada na {loja}.\nAcompanhe: {link}',
    },
    {
        key: 'os_em_andamento', module: 'os', label: 'Em reparo', when: 'Quando a OS muda para "Em andamento".',
        defaultAuto: false, vars: OS_VARS,
        defaultText: 'Olá, {nome}! Seu {aparelho} ({os}) já está em reparo. Assim que ficar pronto a gente avisa.\nAcompanhe: {link}',
    },
    {
        key: 'os_aguardando_pecas', module: 'os', label: 'Aguardando peças', when: 'Quando a OS muda para "Aguardando peças".',
        defaultAuto: false, vars: OS_VARS,
        defaultText: 'Olá, {nome}! Seu {aparelho} ({os}) está aguardando a chegada da peça. Assim que ela chegar seguimos com o reparo.\nAcompanhe: {link}',
    },
    {
        key: 'os_concluida', module: 'os', label: 'Pronto para retirada', when: 'Quando a OS muda para "Concluída".',
        defaultAuto: true, vars: OS_VARS,
        defaultText: 'Olá, {nome}! Boa notícia: seu {aparelho} ({os}) está pronto. ✅\nValor: {valor}.\nPode retirar na {loja} no nosso horário de atendimento.\nDetalhes: {link}',
    },
    {
        key: 'os_faturada', module: 'os', label: 'Entregue', when: 'Quando a OS é paga e entregue ("Faturada").',
        defaultAuto: false, vars: OS_VARS,
        defaultText: 'Obrigado, {nome}! Seu {aparelho} ({os}) foi entregue. Qualquer coisa com o reparo, é só chamar aqui. 🙏',
    },
    {
        key: 'os_cancelada', module: 'os', label: 'OS cancelada', when: 'Quando a OS é cancelada.',
        defaultAuto: false, vars: OS_VARS,
        defaultText: 'Olá, {nome}. A {os} do seu {aparelho} foi cancelada. Se tiver alguma dúvida, é só responder aqui.',
    },

    // ─── Orçamentos ───
    {
        key: 'orcamento_lembrete', module: 'orcamentos', label: 'Lembrete de orçamento parado', when: 'Cerca de 2 horas depois de um orçamento com telefone que ainda não virou OS.',
        defaultAuto: true, vars: ['nome', 'aparelho', 'servico', 'link', 'loja'],
        defaultText: 'Oi, tudo bem? Vi aqui que você chegou a pedir um orçamento pra {servico} do seu {aparelho}. Ainda tá precisando? Consigo encaixar rapidinho aqui na loja, é só me falar 🙂\n\n{link}',
    },

    // ─── Vendas ───
    {
        key: 'venda_recibo', module: 'vendas', label: 'Recibo da venda', when: 'Quando uma venda com cliente é finalizada no PDV. O mesmo texto vai pelo botão "Enviar recibo".',
        defaultAuto: false, vars: ['nome', 'recibo', 'total', 'loja'],
        defaultText: '{recibo}',
    },

    // ─── Financeiro ───
    {
        key: 'cobranca', module: 'financeiro', label: 'Lembrete de pagamento', when: 'Às 10h do dia do vencimento de uma conta a receber. O mesmo texto vai pelo botão "Cobrar".',
        defaultAuto: false, vars: ['nome', 'valor', 'quando', 'vencimento', 'referencia', 'loja'],
        defaultText: 'Olá, {nome}! Tudo bem? Aqui é da {loja}.\nPassando para lembrar do pagamento de {valor} {quando}{referencia}.\nSe já pagou, pode desconsiderar. Qualquer dúvida é só responder aqui. Obrigado!',
    },

    // ─── Agenda ───
    {
        key: 'agenda_lembrete', module: 'agenda', label: 'Lembrete de horário', when: 'No dia anterior ao horário marcado na Agenda.',
        defaultAuto: false, vars: ['nome', 'data', 'hora', 'servico', 'loja'],
        defaultText: 'Olá, {nome}! Passando para lembrar do seu horário na {loja}: {data} às {hora}.{servico} Se precisar remarcar, é só responder aqui.',
        legacy: { auto: 'appointment_reminder', text: 'appointment_text' },
    },

    // ─── Clientes ───
    {
        key: 'aniversario', module: 'clientes', label: 'Parabéns no aniversário', when: 'Às 10h no dia do aniversário (precisa da data de nascimento no cadastro).',
        defaultAuto: false, vars: ['nome', 'loja'],
        defaultText: 'Feliz aniversário, {nome}! 🎉 A equipe da {loja} deseja um ano incrível. Passando aqui para lembrar que você tem 10% de desconto em película e capinha este mês.',
        legacy: { auto: 'birthday', text: 'birthday_text' },
    },
    {
        key: 'avaliacao', module: 'clientes', label: 'Pedir avaliação no Google', when: 'Alguns dias depois de a OS ser entregue (precisa do link de avaliação em Dados da loja).',
        defaultAuto: false, vars: ['nome', 'aparelho', 'link', 'loja'],
        defaultText: 'Oi, {nome}! Tudo certo com o seu {aparelho}? Se puder, conta pra gente como foi o atendimento da {loja} no Google, ajuda muito: {link}',
        legacy: { auto: 'review', text: 'review_text' },
    },
]

export const MESSAGE_EVENT_KEYS = new Set(MESSAGE_EVENTS.map(e => e.key))

export function messageEvent(key: string) {
    return MESSAGE_EVENTS.find(e => e.key === key) ?? null
}

/** O que cada variável vira, pra mostrar na tela de configuração. */
export const VAR_LABELS: Record<string, string> = {
    nome: 'primeiro nome do cliente',
    os: 'número da OS',
    aparelho: 'aparelho',
    valor: 'valor (a linha some se não tiver)',
    link: 'link (a linha some se não tiver)',
    loja: 'nome da loja',
    endereco: 'endereço da loja',
    servico: 'serviço',
    recibo: 'recibo completo (itens, total e pagamento)',
    total: 'total da venda',
    quando: '"que vence hoje", "que venceu em 03/10"…',
    vencimento: 'data de vencimento',
    referencia: 'OS/observação da conta',
    data: 'dia do horário',
    hora: 'hora do horário',
}

export const MAX_MESSAGE_LENGTH = 1000

// Uma linha com uma destas variáveis vazias (ex.: "Valor: {valor}." numa OS sem valor) sai inteira.
const DROP_LINE_IF_EMPTY = ['valor', 'link']

/** Troca {variavel} pelo valor; variável desconhecida fica como está. */
export function renderTemplate(text: string, vars: Record<string, string>) {
    const fillLine = (line: string) => line.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m))
    return text.split('\n')
        .filter(line => !DROP_LINE_IF_EMPTY.some(k => k in vars && !vars[k] && line.includes(`{${k}}`)))
        .map(line => fillLine(line).replace(/[ \t]+$/g, ''))
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}

/** Valores de exemplo pra pré-visualizar a mensagem na tela de configuração. */
export const SAMPLE_VARS: Record<string, string> = {
    nome: 'Maria',
    os: 'OS-00042',
    aparelho: 'iPhone 13',
    valor: 'R$ 450,00',
    link: 'https://nexusgestor.com/tracking/abc123',
    endereco: 'Rua das Flores, 120, Florianópolis',
    servico: 'troca de tela',
    recibo: '*Sua loja* · Recibo da venda #A1B2\n04/10/2026 10:30\n\n1× Película 3D — R$ 30,00\n*Total: R$ 30,00*\nPix: R$ 30,00\n\nObrigado pela preferência!',
    total: 'R$ 30,00',
    quando: 'que vence hoje',
    vencimento: '04/10',
    referencia: ' (OS-00042)',
    data: 'segunda-feira, 5 de outubro',
    hora: '14:00',
}
