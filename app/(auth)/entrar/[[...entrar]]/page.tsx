'use client'

import Link from 'next/link'
import { SignIn } from '@clerk/nextjs'
import AuthShell, { useClerkAppearance } from '@/components/auth/AuthShell'

/** The app's login. Signing out lands here, never on the marketing site. */
export default function EntrarPage() {
    const appearance = useClerkAppearance()
    return (
        <AuthShell
            title="NexusOS"
            subtitle="Entre para acessar sua loja"
            footer={<>Ainda não usa o NexusOS? <Link href="/sign-up" className="text-primary font-medium">Criar conta</Link></>}
        >
            <SignIn
                routing="path"
                path="/entrar"
                signUpUrl="/sign-up"
                fallbackRedirectUrl="/dashboard"
                appearance={appearance}
            />
        </AuthShell>
    )
}
