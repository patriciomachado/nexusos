'use client'

import Link from 'next/link'
import { SignUp } from '@clerk/nextjs'
import AuthShell, { useClerkAppearance } from '@/components/auth/AuthShell'

export default function SignUpPage() {
    const appearance = useClerkAppearance()
    return (
        <AuthShell
            title="Crie sua conta"
            subtitle="15 dias grátis · sem cartão de crédito"
            footer={<>Já tem conta? <Link href="/entrar" className="text-primary font-medium">Entrar</Link></>}
        >
            <SignUp routing="path" path="/sign-up" signInUrl="/entrar" fallbackRedirectUrl="/dashboard" appearance={appearance} />
        </AuthShell>
    )
}
