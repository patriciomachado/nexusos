import type { Brand } from './brand'

/**
 * The Studio no longer draws a card: it turns the same brand/photos/headline
 * into a written briefing the user pastes into an image or video AI (Canva,
 * ChatGPT, Midjourney, Sora, Runway, Kling…) to get the actual visual
 * themselves.
 */

export type PostFormat = 'feed' | 'story' | 'google'
export type PostTemplate = 'destaque' | 'antes_depois' | 'aparelho'

export const FORMATS: { id: PostFormat; label: string; w: number; h: number }[] = [
    { id: 'feed', label: 'Feed 1:1', w: 1080, h: 1080 },
    { id: 'story', label: 'Story 9:16', w: 1080, h: 1920 },
    { id: 'google', label: 'Google 4:3', w: 1200, h: 900 },
]

export const TEMPLATES: { id: PostTemplate; label: string }[] = [
    { id: 'destaque', label: 'Destaque' },
    { id: 'antes_depois', label: 'Antes e depois' },
    { id: 'aparelho', label: 'Vitrine' },
]

const IMAGE_BRIEF: Record<PostTemplate, string> = {
    destaque: 'uma foto grande ocupando boa parte da imagem, com o título em destaque por cima (texto grande e legível) e um selo com a frase da loja',
    antes_depois: 'duas fotos lado a lado (ou uma em cima da outra, no formato vertical), rotuladas "ANTES" e "DEPOIS", mostrando a transformação do serviço',
    aparelho: 'a foto do aparelho de um lado e, do outro lado, o nome, as características e o preço bem em destaque',
}

const VIDEO_BRIEF: Record<PostTemplate, string> = {
    destaque: 'um plano curto mostrando o serviço sendo feito na bancada, terminando com o produto pronto em destaque',
    antes_depois: 'uma transição do aparelho no estado "antes" para o estado "depois", como um corte seco ou um efeito de deslizar (swipe)',
    aparelho: 'um giro de 360° do aparelho, com close-ups na tela, câmeras e acabamento',
}

export interface PromptInput {
    template: PostTemplate
    format: PostFormat
    brand: Brand
    headline: string
    subline: string
    price?: string
    priceNote?: string
    photoCount: number
}

function contactLine(brand: Brand) {
    return [brand.whatsapp && `WhatsApp ${brand.whatsapp}`, brand.city, brand.instagram && `@${brand.instagram}`].filter(Boolean).join(' · ')
}

export function buildImagePrompt(input: PromptInput) {
    const f = FORMATS.find(x => x.id === input.format) ?? FORMATS[0]
    const t = TEMPLATES.find(x => x.id === input.template)
    const { brand } = input
    const contact = contactLine(brand)

    const lines = [
        `Crie uma imagem para redes sociais no formato ${f.label} (${f.w}x${f.h}px).`,
        `Estilo do post: ${t?.label ?? 'Destaque'} — ${IMAGE_BRIEF[input.template]}.`,
        `Título principal: "${input.headline}"`,
        input.subline && `Texto de apoio: "${input.subline}"`,
        input.price && `Preço em destaque: ${input.price}${input.priceNote ? ` · ${input.priceNote}` : ''}`,
        `Cores da marca: use ${brand.primary} como cor principal e ${brand.secondary} como cor de destaque (selos, botões, preço).`,
        `Rodapé com a identidade da loja: "${brand.name}"${brand.tagline ? `, slogan "${brand.tagline}"` : ''}${contact ? `, contato: ${contact}` : ''}.`,
        input.photoCount > 0
            ? `Vou enviar ${input.photoCount} foto${input.photoCount > 1 ? 's' : ''} real${input.photoCount > 1 ? 'is' : ''} para usar na imagem — deixe espaço para ela${input.photoCount > 1 ? 's' : ''}.`
            : 'Não tenho foto para esse post — use um ícone, ilustração ou fundo com textura no lugar.',
        'Estilo visual: moderno, limpo, tipografia bold e fácil de ler, boa hierarquia visual, alto contraste entre texto e fundo.',
    ].filter((l): l is string => Boolean(l))

    return lines.join('\n')
}

export function buildVideoPrompt(input: PromptInput) {
    const { brand } = input
    const aspect = input.format === 'story' ? 'vertical (9:16, estilo Reels/Stories/TikTok)' : input.format === 'google' ? 'paisagem (4:3)' : 'quadrado (1:1)'
    const t = TEMPLATES.find(x => x.id === input.template)
    const contact = contactLine(brand)

    const lines = [
        `Crie um vídeo curto (10 a 15 segundos) para redes sociais, no formato ${aspect}.`,
        `Cena: ${t?.label ?? 'Destaque'} — ${VIDEO_BRIEF[input.template]}.`,
        `Tema: "${input.headline}"${input.subline ? ` — ${input.subline}` : ''}`,
        input.price && `Mostrar o preço em algum momento: ${input.price}${input.priceNote ? ` (${input.priceNote})` : ''}`,
        input.photoCount > 0
            ? `Use ${input.photoCount > 1 ? 'as fotos reais que vou enviar' : 'a foto real que vou enviar'} como referência do aparelho/produto real.`
            : 'Sem foto de referência — pode criar um cenário de assistência técnica genérico e realista.',
        'Estilo: realista, boa iluminação, câmera estável, cortes curtos e dinâmicos.',
        `No final, mostrar em texto na tela: "${brand.name}"${contact ? `, ${contact}` : ''}.`,
    ].filter((l): l is string => Boolean(l))

    return lines.join('\n')
}
