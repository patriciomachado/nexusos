import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import OnboardingFlow from '@/components/landing/OnboardingFlow'

export default async function LandingPage() {
  const { userId } = await auth()

  // Redirect if already logged in
  if (userId) {
    redirect('/dashboard')
  }

  return <OnboardingFlow />
}
