import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function POST(req: NextRequest) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    return NextResponse.json({ 
        role: 'assistant', 
        content: 'Olá! O serviço da Aura AI está temporariamente desativado para manutenção e atualizações. Por favor, utilize as funções manuais do sistema por enquanto.' 
    })
}
