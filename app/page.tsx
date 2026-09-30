import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import Landing from '@/components/landing/Landing'

export const metadata: Metadata = {
  title: 'Nexus OS · Organização e controle da sua assistência técnica',
  description: 'Ordens de serviço, PDV, caixa, estoque, equipe e relatórios em um só lugar. Teste grátis por 15 dias.',
}

export default async function LandingPage() {
  const { userId } = await auth()

  // Signed in: straight to the app
  if (userId) {
    redirect('/dashboard')
  }

  return <Landing />
}
