import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

import { ThemeProvider } from '@/components/providers/ThemeProvider'
import IOSViewportFix from '@/components/providers/IOSViewportFix'

export const metadata: Metadata = {
  title: 'Nexus OS',
  description: 'Plataforma completa para gerenciar ordens de serviço e financeiro.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    // Full-screen app: with 'default' iOS shrinks the app area by the status bar
    // height a second time, leaving a blank strip at the bottom. The status bar
    // area is painted by the strip below.
    statusBarStyle: 'black-translucent',
    title: 'Nexus OS',
  },
  // Next only emits mobile-web-app-capable, which iOS ignores: without the
  // Apple tag the installed app runs in manifest mode, where the translucent
  // status bar leaves the app area 59pt short at the bottom (iOS 18).
  other: {
    'apple-mobile-web-app-capable': 'yes',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F2F2F7' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      signInUrl="/entrar"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
      afterSignOutUrl="/entrar"
    >
      <html lang="pt-BR" suppressHydrationWarning>
        <body className={`${inter.variable} font-sans`} suppressHydrationWarning>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <IOSViewportFix />
            {/* Behind the iPhone clock (installed app): its text is white, so a dark strip keeps it readable. */}
            <div aria-hidden className="fixed top-0 inset-x-0 h-[env(safe-area-inset-top)] bg-black z-[700] pointer-events-none" />
            <Toaster
              position="top-center"
              offset={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
              mobileOffset={{ top: "calc(env(safe-area-inset-top) + 8px)" }}
              toastOptions={{
                style: {
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  color: 'hsl(var(--foreground))',
                  borderRadius: '14px',
                  boxShadow: '0 8px 32px rgb(0 0 0 / 0.12)',
                },
              }}
            />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
