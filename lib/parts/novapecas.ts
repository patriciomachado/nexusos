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

/** Produtos que batem com o termo buscado, com nome e link (sem preço ainda). */
export async function searchNovaPecas(query: string, limit = 8): Promise<NovaPecasProduct[]> {
    const html = await get(`${BASE}/pesquisa?busca=${encodeURIComponent(query)}`)
    const re = /<div class="nome[^"]*">\s*<a href="(https:\/\/novapecascell\.com\.br\/produto\/[^"]+)">([^<]+)<\/a>/g
    const seen = new Set<string>()
    const out: NovaPecasProduct[] = []
    for (const m of html.matchAll(re)) {
        const url = m[1]
        if (seen.has(url) || out.length >= limit) continue
        seen.add(url)
        out.push({ url, title: m[2].replace(/^\d+\s*-\s*/, '').trim() })
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
