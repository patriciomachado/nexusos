import 'server-only'

/**
 * Consulta de preço no catálogo público da NovaPeças (novapecascell.com.br),
 * o fornecedor que a loja usa pra WEFIX e as outras linhas. O site não exige
 * login pra ver produto e preço, então isso é uma leitura simples da página —
 * sem senha, sem sessão guardada. Feito sob demanda (a pessoa clica em
 * "Buscar"), nunca em segundo plano.
 */

const BASE = 'https://novapecascell.com.br'
const UA = 'Mozilla/5.0 (compatible; NexusOS/1.0; +https://nexusgestor.com)'
const TIMEOUT_MS = 8000

async function get(url: string): Promise<string> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
        const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: controller.signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return await res.text()
    } finally {
        clearTimeout(timer)
    }
}

export interface NovaPecasProduct { title: string; url: string }
export interface NovaPecasResult extends NovaPecasProduct { price: number | null }

/**
 * A NovaPeças vende a mesma peça em 3 linhas de marca, que a loja usa como as
 * 3 qualidades do orçamento: WEFIX (Genuína), WK (Premium), NN (Standard) —
 * sempre no nome do produto, ex. "FRONTAL IPHONE 11 PREMIUM ... - WEFIX - W1002".
 */
export const BRAND_QUALITY: Record<string, { quality: string; label: string }> = {
    WEFIX: { quality: 'original', label: 'Genuína' },
    WK: { quality: 'premium', label: 'Premium' },
    NN: { quality: 'standard', label: 'Standard' },
}
const BRAND_ORDER = ['WEFIX', 'WK', 'NN'] as const

function detectBrand(title: string): keyof typeof BRAND_QUALITY | null {
    const m = title.toUpperCase().match(/\b(WEFIX|WK|NN)\b/)
    return (m?.[1] as keyof typeof BRAND_QUALITY) ?? null
}

export interface NovaPecasTier { tipo: string; custo: number; produto: string; url: string }

/**
 * A busca do site exige que TODAS as palavras apareçam no produto (nem que
 * seja em outro campo) — então "troca de tela" não acha nada (nenhum produto
 * tem literalmente "de"), mas "troca tela" acha. Tira palavras de conexão e
 * verbos do nosso jeito de falar ("troca de", "conserto de") que não
 * aparecem no nome dos produtos do fornecedor.
 */
const DROP_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'para', 'com', 'em', 'no', 'na', 'a', 'o', 'as', 'os', 'e', 'troca', 'trocar', 'reparo', 'conserto', 'manutencao', 'manutenção', 'substituicao', 'substituição', 'substituir'])

// "Tela"/"display" é como a loja fala; no catálogo do fornecedor a peça é
// sempre listada como "frontal" (em qualquer marca — WEFIX, WK, TELA PRIME).
const SYNONYMS: Record<string, string> = { tela: 'frontal', telas: 'frontal', display: 'frontal', displays: 'frontal' }

function searchTerm(query: string) {
    const words = query.trim().split(/\s+/)
        .filter(w => !DROP_WORDS.has(w.toLowerCase()))
        .map(w => SYNONYMS[w.toLowerCase()] ?? w)
    return words.join(' ').trim() || query.trim()
}

// Ordem importa: "pro max" antes de "pro", senão "pro" já casa primeiro.
const VARIANTS = ['pro max', 'ultra', 'plus', 'mini', 'lite', 'se', 'pro'] as const

/** Variação do aparelho (Pro, Pro Max, Plus…) pra não misturar iPhone 16 com 16 Plus/Pro/Pro Max. */
function detectVariant(text: string): string | null {
    const t = text.toLowerCase()
    for (const v of VARIANTS) {
        if (new RegExp(`\\b${v.replace(' ', '\\s+')}\\b`).test(t)) return v
    }
    return null
}

/** Números do aparelho buscado (ex.: "16" em "iPhone 16"), pra exigir que apareçam como número mesmo no produto. */
function numberTokens(text: string): string[] {
    return text.match(/\b\d{1,3}\b/g) ?? []
}

/** O produto tem os mesmos números do aparelho como número — não só escondidos num código como "K1016". */
function matchesNumbers(numbers: string[], title: string) {
    return numbers.every(n => new RegExp(`\\b${n}\\b`).test(title))
}

/** Produtos que batem com o termo buscado, com nome e link (sem preço ainda). */
export async function searchNovaPecas(query: string, limit = 8): Promise<NovaPecasProduct[]> {
    const html = await get(`${BASE}/pesquisa?busca=${encodeURIComponent(searchTerm(query))}`)
    const re = /<div class="nome[^"]*">\s*<a href="(https:\/\/novapecascell\.com\.br\/produto\/[^"]+)">([^<]+)<\/a>/g
    const wantedVariant = detectVariant(query)
    const numbers = numberTokens(query)
    // Quem procurou "tela"/"display" quer a peça, não a câmera frontal — essas sempre começam o nome com "Frontal".
    const wantsScreen = /\b(telas?|displays?)\b/i.test(query)
    const seen = new Set<string>()
    const out: NovaPecasProduct[] = []
    for (const m of html.matchAll(re)) {
        const url = m[1]
        const title = m[2].replace(/^\d+\s*-\s*/, '').trim()
        if (seen.has(url) || detectVariant(title) !== wantedVariant || !matchesNumbers(numbers, title)) continue
        if (wantsScreen && !/^frontal/i.test(title)) continue
        seen.add(url)
        out.push({ url, title })
        if (out.length >= limit) break
    }
    return out
}

/** Preço à vista mostrado na página do produto (a única faixa de preço exibida no site). */
export async function fetchNovaPecasPrice(url: string): Promise<number | null> {
    if (!url.startsWith(`${BASE}/produto/`)) throw new Error('Link inválido')
    const html = await get(url)
    const m = html.match(/precoCor['"]>\s*R\$\s?([\d.,]+)/)
    if (!m) return null
    return Number(m[1].replace(/\./g, '').replace(',', '.'))
}

/** Busca e já traz o preço de cada resultado — poucas requisições, uso pontual (clique manual). */
export async function searchNovaPecasWithPrices(query: string, limit = 6): Promise<NovaPecasResult[]> {
    const candidates = await searchNovaPecas(query, limit)
    return Promise.all(candidates.map(async c => {
        try { return { ...c, price: await fetchNovaPecasPrice(c.url) } }
        catch { return { ...c, price: null } }
    }))
}

/**
 * Igual à busca normal, mas separa os resultados pelas 3 linhas de marca da
 * NovaPeças e traz uma opção de cada uma achada (Genuína/WEFIX, Premium/WK,
 * Standard/NN) — pra orçamentos com as mesmas 3 qualidades de quando a peça
 * está cadastrada na loja, mesmo sem cadastro nenhum.
 */
export async function searchNovaPecasTiers(query: string, limit = 20): Promise<NovaPecasTier[]> {
    const candidates = await searchNovaPecas(query, limit)
    const byBrand = new Map<string, NovaPecasProduct>()
    for (const c of candidates) {
        const brand = detectBrand(c.title)
        if (brand && !byBrand.has(brand)) byBrand.set(brand, c)
    }
    const picked = BRAND_ORDER.map(b => byBrand.get(b)).filter((c): c is NovaPecasProduct => !!c)
    const withPrices = await Promise.all(picked.map(async c => {
        const brand = detectBrand(c.title)!
        try {
            const price = await fetchNovaPecasPrice(c.url)
            return price != null ? { tipo: BRAND_QUALITY[brand].label, custo: price, produto: c.title, url: c.url } : null
        } catch { return null }
    }))
    return withPrices.filter((t): t is NovaPecasTier => t != null)
}
