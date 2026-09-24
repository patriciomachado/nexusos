import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

import { ThemeProvider } from '@/components/providers/ThemeProvider'

export const metadata: Metadata = {
  title: 'Nexus OS',
  description: 'Plataforma completa para gerenciar ordens de serviço e financeiro.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Nexus OS',
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
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <html lang="pt-BR" suppressHydrationWarning>
        <body className={`${inter.variable} font-sans`} suppressHydrationWarning>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
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
