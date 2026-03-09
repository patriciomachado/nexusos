'use client'

import { UserProfile } from '@clerk/nextjs'
import Header from '@/components/layout/Header'
import { useTheme } from 'next-themes'
import { dark } from '@clerk/themes'
import { useEffect, useState } from 'react'

export default function ProfilePage() {
    const { resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => setMounted(true), [])

    return (
        <div className="animate-fade-in pb-20 bg-background min-h-screen transition-colors duration-300">
            <Header title="Configurar Perfil" />

            <div className="p-6 max-w-5xl mx-auto flex justify-center mt-8">
                {mounted && (
                    <UserProfile
                        appearance={{
                            baseTheme: resolvedTheme === 'dark' ? dark : undefined,
                            elements: {
                                rootBox: "mx-auto w-full max-w-4xl",
                                card: "w-full max-w-full shadow-2xl rounded-2xl border border-border bg-card",
                            }
                        }}
                    />
                )}
            </div>
        </div>
    )
}
