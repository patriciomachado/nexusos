import { fillBrand, type Brand } from './brand'
import { eventById } from './events'

/**
 * Where a post comes from, and the ready-made texts and art for each source.
 * Everything here runs without AI; the AI is an extra, per text, on request.
 */

export interface OsSource {
    type: 'os'
    id: string
    number: string | null
    device: string
    problem: string
    solution: string
    photos: string[]
    /** The last photo was taken after the repair. */
    hasAfter: boolean
}

export interface DeviceSource {
    type: 'device'
    id: string
    name: string
    condition: string
    price: number
    installment: number
    battery: number | null
    warrantyMonths: number
    photos: string[]
}

export interface SeasonalSource { type: 'seasonal'; id: string }
export interface ManualSource { type: 'manual'; topic: string }

export type Source = OsSource | DeviceSource | SeasonalSource | ManualSource

export type Channel = 'instagram' | 'whatsapp' | 'google' | 'roteiro'
export type Texts = Record<Channel, string>

export const CHANNELS: { id: Channel; label: string }[] = [
    { id: 'instagram', label: 'Instagram' },
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'google', label: 'Google' },
    { id: 'roteiro', label: 'Roteiro de vídeo' },
]

export const CONDITION_LABEL: Record<string, string> = {
    novo_lacrado: 'Novo lacrado',
    seminovo_a: 'Seminovo A',
    seminovo_b: 'Seminovo B',
    recondicionado: 'Recondicionado',
}

const money = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function sourceTitle(s: Source) {
    switch (s.type) {
        case 'os': return `${s.device}${s.number ? ` · OS ${s.number}` : ''}`
        case 'device': return s.name
        case 'seasonal': return eventById(s.id)?.title ?? 'Data comemorativa'
        case 'manual': return s.topic || 'Post livre'
    }
}

/** Big and small lines of the art. */
export function artLines(s: Source): { headline: string; subline: string } {
    switch (s.type) {
        case 'os': return { headline: s.device, subline: s.solution || 'Consertado e entregue com garantia' }
        case 'device': return {
            headline: s.name,
            subline: [CONDITION_LABEL[s.condition] ?? s.condition, s.battery ? `Bateria ${s.battery}%` : '', s.warrantyMonths ? `${s.warrantyMonths} meses de garantia` : ''].filter(Boolean).join(' · '),
        }
        case 'seasonal': {
            const e = eventById(s.id)
            return { headline: e?.headline ?? 'Data especial', subline: e?.subline ?? '' }
        }
        case 'manual': return { headline: s.topic || 'Sua oferta aqui', subline: 'Fale com a gente no WhatsApp' }
    }
}

function roteiro(hook: string, scenes: string[], cta: string) {
    return `GANCHO (3 s)\n${hook}\n\n${scenes.map((c, i) => `CENA ${i + 1}\n${c}`).join('\n\n')}\n\nCHAMADA\n${cta}`
}

/** The texts a post starts with, before any AI. */
export function readyTexts(s: Source, brand: Brand): Texts {
    const t = (x: string) => fillBrand(x, brand)
    switch (s.type) {
        case 'os': {
            const fix = s.solution || 'conserto concluído'
            const problem = s.problem ? s.problem.replace(/\.$/, '') : 'chegou com defeito'
            return {
                instagram: t(`Antes e depois de hoje na bancada 🔧\n\n📱 ${s.device}\n❌ Problema: ${problem}\n✅ Solução: ${fix}\n\nAparelho entregue funcionando e com garantia.\n\nSeu aparelho está com o mesmo problema? Fale com a {loja}.\n📍 {cidade} · 💬 {whatsapp}\n\n#antesedepois #assistenciatecnica #{hashcidade}`),
                whatsapp: t(`Oi! Olha o conserto de hoje na {loja} 🔧\n\n${s.device}: ${problem}. Solução: ${fix}. Entregue com garantia.\n\nSe o seu estiver com algum problema, é só me chamar!`),
                google: t(`Conserto de ${s.device} na {loja}, em {cidade}: ${problem}. Solução: ${fix}. Entregue com garantia. Orçamento pelo WhatsApp {whatsapp}.`),
                roteiro: t(roteiro(
                    `Esse ${s.device} chegou assim: ${problem}. Será que tem jeito?`,
                    ['Mostre o aparelho como chegou, bem de perto.', `Mostre a bancada durante o serviço: ${fix}.`, 'Mostre o aparelho funcionando e ligado.'],
                    'Seu aparelho está assim? Chama a {loja} no WhatsApp: {whatsapp}.',
                )),
            }
        }
        case 'device': {
            const price = s.price ? money(s.price) : ''
            const parcel = s.installment && s.installment > s.price ? ` ou ${money(s.installment)} parcelado` : ''
            const specs = artLines(s).subline
            return {
                instagram: t(`Chegou na {loja}: ${s.name} 📱\n\n${specs}${price ? `\n\n💰 ${price} à vista${parcel}` : ''}\n\nRevisado pela nossa bancada e com nota. Aceitamos seu usado na troca.\n\n📍 {cidade} · 💬 {whatsapp}\n\n#celularseminovo #iphone #android #{hashcidade}`),
                whatsapp: t(`Oi! Chegou ${s.name} na {loja} 📱\n${specs}${price ? `\n${price} à vista${parcel}` : ''}\n\nQuer que eu separe para você? Aceitamos seu usado na troca.`),
                google: t(`${s.name} disponível na {loja}, em {cidade}. ${specs}.${price ? ` ${price} à vista${parcel}.` : ''} Aceitamos seu usado na troca. WhatsApp: {whatsapp}.`),
                roteiro: t(roteiro(
                    `${s.name} revisado${price ? ` por ${price}` : ''}. Olha o estado dele!`,
                    ['Mostre o aparelho de todos os lados, com boa luz.', `Mostre a tela de saúde da bateria${s.battery ? ` (${s.battery}%)` : ''} e as câmeras funcionando.`, 'Mostre a caixa, os acessórios e a garantia.'],
                    'Quer ele? Chama a {loja} no WhatsApp: {whatsapp}. Aceitamos seu usado na troca.',
                )),
            }
        }
        case 'seasonal': {
            const e = eventById(s.id)
            if (!e) return readyTexts({ type: 'manual', topic: '' }, brand)
            return {
                instagram: t(e.texts.instagram),
                whatsapp: t(e.texts.whatsapp),
                google: t(e.texts.google),
                roteiro: t(roteiro(`${e.headline}!`, ['Apareça na bancada e fale do tema em uma frase.', `Mostre o serviço ligado à data: ${e.subline}`, 'Mostre a fachada ou o balcão da loja.'], 'Chama a {loja} no WhatsApp: {whatsapp}.')),
            }
        }
        case 'manual': {
            const topic = s.topic || 'Novidade na loja'
            return {
                instagram: t(`${topic}\n\nFale com a {loja}.\n📍 {cidade} · 💬 {whatsapp}\n\n#assistenciatecnica #{hashcidade}`),
                whatsapp: t(`Oi! Aqui é da {loja} 👋\n\n${topic}\n\nQualquer dúvida é só responder!`),
                google: t(`${topic}. {loja}, em {cidade}. WhatsApp: {whatsapp}.`),
                roteiro: t(roteiro(`${topic}!`, ['Apresente o assunto em uma frase, olhando para a câmera.', 'Mostre na bancada ou no balcão.'], 'Chama a {loja} no WhatsApp: {whatsapp}.')),
            }
        }
    }
}

/** Short context line the AI gets about the source (kept small on purpose: fewer tokens). */
export function aiSubject(s: Source) {
    switch (s.type) {
        case 'os': return `Conserto concluído. Aparelho: ${s.device}. Defeito: ${s.problem || 'não informado'}. Solução: ${s.solution || 'não informada'}.`
        case 'device': return `Aparelho à venda: ${s.name}. ${artLines(s).subline}. Preço à vista: ${s.price ? money(s.price) : 'não informado'}${s.installment > s.price ? `, parcelado ${money(s.installment)}` : ''}. Aceita usado na troca.`
        case 'seasonal': {
            const e = eventById(s.id)
            return e ? `Data comemorativa: ${e.title}. Ideia: ${e.headline}. ${e.subline} ${e.why}` : 'Data comemorativa.'
        }
        case 'manual': return `Assunto: ${s.topic}`
    }
}
