'use client'

import dynamic from 'next/dynamic'

// Carrega o chat apenas no lado do cliente
const AIAssistant = dynamic(() => import('./ai-assistant'), { 
    ssr: false,
    loading: () => null // Não mostra nada enquanto carrega
})

export default function ClientAIWrapper() {
    return <AIAssistant />
}
