import type { Brand } from './brand'

/**
 * Ready-to-post art, drawn in the browser on a canvas: the store's colors,
 * logo and contacts, the photos of the service or device, and a headline.
 * No image AI: instant, free and always on-brand.
 */

export type ArtFormat = 'feed' | 'story' | 'google'
export type ArtTemplate = 'destaque' | 'antes_depois' | 'aparelho'

export const FORMATS: { id: ArtFormat; label: string; w: number; h: number }[] = [
    { id: 'feed', label: 'Feed 1:1', w: 1080, h: 1080 },
    { id: 'story', label: 'Story 9:16', w: 1080, h: 1920 },
    { id: 'google', label: 'Google 4:3', w: 1200, h: 900 },
]

export const TEMPLATES: { id: ArtTemplate; label: string }[] = [
    { id: 'destaque', label: 'Destaque' },
    { id: 'antes_depois', label: 'Antes e depois' },
    { id: 'aparelho', label: 'Vitrine' },
]

export interface ArtInput {
    template: ArtTemplate
    format: ArtFormat
    brand: Brand
    headline: string
    subline: string
    /** Big price line (Vitrine), e.g. "R$ 2.499". */
    price?: string
    /** Small line under the price, e.g. "ou 12x de R$ 229". */
    priceNote?: string
    photos: string[]
}

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

// ─── Images ──────────────────────────────────────────────────────────────────

const cache = new Map<string, Promise<HTMLImageElement | null>>()

/** Our storage goes through /api/studio/image so the canvas can still be exported. */
function proxied(src: string) {
    if (src.startsWith('data:') || src.startsWith('blob:') || src.startsWith('/')) return src
    return `/api/studio/image?url=${encodeURIComponent(src)}`
}

export function loadImage(src: string | null | undefined): Promise<HTMLImageElement | null> {
    if (!src) return Promise.resolve(null)
    if (!cache.has(src)) {
        cache.set(src, new Promise(resolve => {
            const img = new Image()
            img.decoding = 'async'
            img.onload = () => resolve(img)
            img.onerror = () => { cache.delete(src); resolve(null) }
            img.src = proxied(src)
        }))
    }
    return cache.get(src)!
}

// ─── Drawing helpers ─────────────────────────────────────────────────────────

function luminance(hex: string) {
    const n = parseInt(hex.slice(1), 16)
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 })
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const inkOn = (hex: string) => (luminance(hex) > 0.45 ? '#111111' : '#FFFFFF')

function shade(hex: string, amount: number) {
    const n = parseInt(hex.slice(1), 16)
    const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + (amount < 0 ? v * amount : (255 - v) * amount))))
    return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => f(v).toString(16).padStart(2, '0')).join('')}`
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, r)
}

/** Draws an image covering the box (like object-fit: cover), clipped to rounded corners. */
function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, r = 0) {
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
    const sw = w / scale, sh = h / scale
    ctx.save()
    roundRect(ctx, x, y, w, h, r)
    ctx.clip()
    ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h)
    ctx.restore()
}

/** Wraps text into lines that fit the width; shrinks the font until it fits maxLines. */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, size: number, maxLines: number, weight = 800, min = 28) {
    let s = size
    for (; s >= min; s -= 4) {
        ctx.font = `${weight} ${s}px ${FONT}`
        const lines = wrap(ctx, text, maxWidth)
        if (lines.length <= maxLines) return { lines, size: s }
    }
    ctx.font = `${weight} ${min}px ${FONT}`
    const lines = wrap(ctx, text, maxWidth)
    if (lines.length > maxLines) {
        lines.length = maxLines
        lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '…')
    }
    return { lines, size: min }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
    const lines: string[] = []
    for (const para of text.split('\n')) {
        let line = ''
        for (const word of para.split(/\s+/).filter(Boolean)) {
            const test = line ? `${line} ${word}` : word
            if (ctx.measureText(test).width <= maxWidth || !line) line = test
            else { lines.push(line); line = word }
        }
        if (line) lines.push(line)
    }
    return lines
}

function drawLines(ctx: CanvasRenderingContext2D, lines: string[], x: number, y: number, size: number, lineHeight = 1.12) {
    lines.forEach((l, i) => ctx.fillText(l, x, y + i * size * lineHeight))
    return y + lines.length * size * lineHeight
}

function pill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, bg: string, fg: string) {
    ctx.font = `800 ${size}px ${FONT}`
    const w = ctx.measureText(text).width + size * 1.4
    const h = size * 1.8
    ctx.fillStyle = bg
    roundRect(ctx, x, y, w, h, h / 2)
    ctx.fill()
    ctx.fillStyle = fg
    ctx.textBaseline = 'middle'
    ctx.fillText(text, x + size * 0.7, y + h / 2 + 1)
    ctx.textBaseline = 'alphabetic'
    return w
}

/** Bottom strip: logo, store name, WhatsApp and city/Instagram. */
async function footer(ctx: CanvasRenderingContext2D, W: number, H: number, brand: Brand, height: number) {
    const y = H - height
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, y, W, height)
    const pad = W * 0.055
    const logo = await loadImage(brand.logoUrl)
    let x = pad
    const size = height * 0.62
    if (logo) {
        const ratio = logo.naturalWidth / logo.naturalHeight
        const lw = Math.min(size * Math.max(ratio, 1), W * 0.28)
        const lh = lw / Math.max(ratio, 1)
        ctx.drawImage(logo, x, y + (height - lh) / 2, lw, lh)
        x += lw + pad * 0.6
    }
    ctx.fillStyle = '#111111'
    ctx.font = `800 ${height * 0.26}px ${FONT}`
    ctx.fillText(brand.name, x, y + height * 0.44, W - x - pad)
    const contact = [brand.whatsapp && `WhatsApp ${brand.whatsapp}`, brand.instagram ? `@${brand.instagram}` : brand.city].filter(Boolean).join('  ·  ')
    ctx.fillStyle = '#555555'
    ctx.font = `600 ${height * 0.19}px ${FONT}`
    ctx.fillText(contact, x, y + height * 0.76, W - x - pad)
    ctx.fillStyle = brand.primary
    ctx.fillRect(0, y, W, Math.max(6, height * 0.05))
}

// ─── Templates ───────────────────────────────────────────────────────────────

export async function renderArt(canvas: HTMLCanvasElement, input: ArtInput) {
    const f = FORMATS.find(x => x.id === input.format) ?? FORMATS[0]
    const W = f.w, H = f.h
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { brand } = input
    const ink = inkOn(brand.primary)
    const pad = W * 0.07
    const footH = Math.round(Math.min(W, H) * 0.15)
    const tall = H / W > 1.3
    const wide = W / H > 1.2

    // Background: brand color with a soft diagonal shade.
    const g = ctx.createLinearGradient(0, 0, W, H)
    g.addColorStop(0, brand.primary)
    g.addColorStop(1, shade(brand.primary, -0.35))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)

    const photos = (await Promise.all(input.photos.slice(0, 6).map(loadImage))).filter((x): x is HTMLImageElement => !!x)
    const area = H - footH

    ctx.textBaseline = 'alphabetic'

    if (input.template === 'antes_depois' && photos.length >= 2) {
        const before = photos[0], after = photos[photos.length - 1]
        const { lines, size } = fitText(ctx, input.headline, W - pad * 2, tall ? 92 : 72, 2)
        ctx.fillStyle = ink
        // Photos start right under the title, however many lines it took.
        const top = drawLines(ctx, lines, pad, pad + size, size) + pad * 0.35
        const gap = W * 0.03
        const boxH = area - top - pad * 0.8
        if (tall) {
            const h = (boxH - gap) / 2
            cover(ctx, before, pad, top, W - pad * 2, h, 28)
            cover(ctx, after, pad, top + h + gap, W - pad * 2, h, 28)
            pill(ctx, 'ANTES', pad + 24, top + 24, 40, '#111111', '#FFFFFF')
            pill(ctx, 'DEPOIS', pad + 24, top + h + gap + 24, 40, brand.secondary, inkOn(brand.secondary))
        } else {
            const w = (W - pad * 2 - gap) / 2
            cover(ctx, before, pad, top, w, boxH, 28)
            cover(ctx, after, pad + w + gap, top, w, boxH, 28)
            pill(ctx, 'ANTES', pad + 20, top + 20, 34, '#111111', '#FFFFFF')
            pill(ctx, 'DEPOIS', pad + w + gap + 20, top + 20, 34, brand.secondary, inkOn(brand.secondary))
        }
    } else if (input.template === 'aparelho' || (input.template === 'antes_depois' && photos.length < 2)) {
        // Vitrine: photo on one side (top on tall/square), name and price on the other.
        const photo = photos[0]
        if (wide) {
            const pw = W * 0.46
            if (photo) cover(ctx, photo, pad, pad, pw - pad, area - pad * 2, 28)
            const x = photo ? pw + pad * 0.6 : pad
            textBlock(ctx, input, x, pad * 1.4, W - x - pad, area - pad * 2, ink, 70)
        } else {
            const ph = tall ? area * 0.5 : area * 0.5
            if (photo) cover(ctx, photo, pad, pad, W - pad * 2, ph - pad, 32)
            const y = photo ? ph + pad * 0.3 : pad * 1.6
            textBlock(ctx, input, pad, y, W - pad * 2, area - y - pad * 0.5, ink, tall ? 96 : 76)
        }
    } else {
        // Destaque: optional photo band, big headline, subline, badge with the tagline.
        const photo = photos[photos.length - 1]
        let y = pad
        if (photo) {
            const ph = tall ? area * 0.45 : wide ? area * 0.5 : area * 0.42
            cover(ctx, photo, 0, 0, W, ph)
            const fade = ctx.createLinearGradient(0, ph * 0.55, 0, ph)
            fade.addColorStop(0, 'rgba(0,0,0,0)')
            fade.addColorStop(1, brand.primary)
            ctx.fillStyle = fade
            ctx.fillRect(0, 0, W, ph)
            y = ph + pad * 0.2
        } else {
            y = tall ? area * 0.28 : pad * 1.4
        }
        textBlock(ctx, input, pad, y, W - pad * 2, area - y - pad * 0.5, ink, tall ? 118 : wide ? 76 : 96)
    }

    await footer(ctx, W, H, brand, footH)
}

function textBlock(ctx: CanvasRenderingContext2D, input: ArtInput, x: number, y: number, w: number, h: number, ink: string, size: number) {
    const { brand } = input
    const head = fitText(ctx, input.headline, w, size, 3)
    ctx.fillStyle = ink
    let cy = drawLines(ctx, head.lines, x, y + head.size, head.size)
    if (input.subline) {
        const sub = fitText(ctx, input.subline, w, Math.round(head.size * 0.42), 3, 600, 24)
        ctx.globalAlpha = 0.9
        cy = drawLines(ctx, sub.lines, x, cy + sub.size * 0.9, sub.size, 1.3)
        ctx.globalAlpha = 1
    }
    if (input.price) {
        const s = Math.round(head.size * 0.9)
        if (cy + s * 2 < y + h) {
            cy += s * 0.5
            pill(ctx, input.price, x, cy, s * 0.62, brand.secondary, inkOn(brand.secondary))
            cy += s * 0.62 * 1.8
            if (input.priceNote) {
                ctx.fillStyle = ink
                ctx.font = `600 ${Math.round(s * 0.34)}px ${FONT}`
                ctx.fillText(input.priceNote, x, cy + s * 0.5, w)
            }
        }
    } else if (brand.tagline && cy + 80 < y + h) {
        pill(ctx, brand.tagline, x, cy + 24, Math.round(head.size * 0.3), brand.secondary, inkOn(brand.secondary))
    }
}

export function canvasBlob(canvas: HTMLCanvasElement) {
    return new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
}
