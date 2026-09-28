import { FORMATS, TEMPLATES, type ArtFormat, type ArtTemplate } from './art'
import type { Brand } from './brand'

/**
 * The canvas art is free and instant, but plain. For a more elaborate visual,
 * this turns the same headline/brand/photos into a briefing the user pastes
 * into Canva (or any image AI) — no API integration needed for this.
 */

const TEMPLATE_BRIEF: Record<ArtTemplate, string> = {
    destaque: 'uma foto grande ocupando boa parte da arte, com o título em destaque por cima (texto grande e legível) e um selo com a frase da loja',
    antes_depois: 'duas fotos lado a lado (ou uma em cima da outra, no formato Story), rotuladas "ANTES" e "DEPOIS", mostrando a transformação do serviço',
    aparelho: 'a foto do aparelho de um lado e, do outro lado, o nome, as características e o preço bem em destaque',
}

export interface CanvaPromptInput {
    template: ArtTemplate
    format: ArtFormat
    brand: Brand
    headline: string
    subline: string
    price?: string
    priceNote?: string
    photoCount: number
}

export function buildCanvaPrompt(input: CanvaPromptInput) {
    const f = FORMATS.find(x => x.id === input.format) ?? FORMATS[0]
    const t = TEMPLATES.find(x => x.id === input.template)
    const { brand } = input
    const contact = [brand.whatsapp && `WhatsApp ${brand.whatsapp}`, brand.city, brand.instagram && `@${brand.instagram}`].filter(Boolean).join(' · ')

    const lines = [
        `Crie uma arte para redes sociais no formato ${f.label} (${f.w}x${f.h}px).`,
        `Estilo do post: ${t?.label ?? 'Destaque'} — ${TEMPLATE_BRIEF[input.template]}.`,
        `Título principal: "${input.headline}"`,
        input.subline && `Texto de apoio: "${input.subline}"`,
        input.price && `Preço em destaque: ${input.price}${input.priceNote ? ` · ${input.priceNote}` : ''}`,
        `Cores da marca: use ${brand.primary} como cor principal e ${brand.secondary} como cor de destaque (selos, botões, preço).`,
        `Rodapé com a identidade da loja: "${brand.name}"${brand.tagline ? `, slogan "${brand.tagline}"` : ''}${contact ? `, contato: ${contact}` : ''}.`,
        input.photoCount > 0
            ? `Vou enviar ${input.photoCount} foto${input.photoCount > 1 ? 's' : ''} real${input.photoCount > 1 ? 'is' : ''} para usar na arte — deixe espaço para ela${input.photoCount > 1 ? 's' : ''}.`
            : 'Não tenho foto para esse post — use um ícone, ilustração ou fundo com textura no lugar.',
        'Estilo visual: moderno, limpo, tipografia bold e fácil de ler, boa hierarquia visual, alto contraste entre texto e fundo.',
    ].filter((l): l is string => Boolean(l))

    return lines.join('\n')
}
