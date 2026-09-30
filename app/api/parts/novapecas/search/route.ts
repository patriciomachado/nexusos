import { NextRequest, NextResponse } from 'next/server'
import { bad, partsContext } from '@/lib/parts/server'
import { searchNovaPecasWithPrices } from '@/lib/parts/novapecas'

/** Consulta ao vivo o catálogo público da NovaPeças (sem login) e traz os preços atuais. */
export async function GET(req: NextRequest) {
    const g = await partsContext(); if ('error' in g) return g.error
    const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
    if (q.length < 2) return bad('Digite pelo menos 2 letras')
    try {
        const results = await searchNovaPecasWithPrices(q)
        return NextResponse.json({ results })
    } catch (err) {
        console.error('[novapecas] search failed:', err)
        return bad('Não foi possível consultar o site agora. Tente de novo em instantes.', 502)
    }
}
