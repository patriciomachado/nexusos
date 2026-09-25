'use client'

import Image from 'next/image'
import { useTheme } from 'next-themes'
import { dark } from '@clerk/themes'

/** Clerk look matched to the app (Apple-style card, app colors, both themes). */
export function useClerkAppearance() {
    const { resolvedTheme } = useTheme()
    const isDark = resolvedTheme === 'dark'
    return {
        baseTheme: isDark ? dark : undefined,
        variables: {
            colorPrimary: isDark ? '#7d7aff' : '#5856d6',
            borderRadius: '12px',
            fontFamily: 'Inter, -apple-system, system-ui, sans-serif',
            fontSize: '15px',
        },
        elements: {
            rootBox: 'w-full',
            cardBox: 'w-full shadow-none rounded-[22px] border border-border/70',
            card: 'shadow-none bg-card',
            header: 'hidden',
            formButtonPrimary: 'h-11 text-[16px] font-semibold normal-case shadow-none',
            formFieldInput: 'h-11 text-[16px]',
            socialButtonsBlockButton: 'h-11',
            footer: 'bg-card',
        },
    }
}

/**
 * The app's own sign-in/sign-up frame: no marketing, just the app icon and
 * the form, full-screen and safe-area aware (installed iPhone app).
 */
export default function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer?: React.ReactNode }) {
    return (
        <div
            className="min-h-dvh bg-background flex flex-col items-center justify-center px-4"
            style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))', paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
        >
            <main className="w-full max-w-[400px] flex flex-col items-center">
                <Image src="/logo.png" alt="" width={72} height={72} priority className="w-[72px] h-[72px] rounded-[18px] shadow-sm border border-border/60 bg-card object-contain" />
                <h1 className="mt-4 type-title2 text-foreground text-center">{title}</h1>
                <p className="mt-1 text-[15px] text-muted-foreground text-center">{subtitle}</p>
                <div className="mt-6 w-full flex justify-center">{children}</div>
                {footer && <div className="mt-6 text-[14px] text-muted-foreground text-center">{footer}</div>}
            </main>
        </div>
    )
}
