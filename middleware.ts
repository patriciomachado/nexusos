import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
    '/',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/loja(.*)',
    '/c/(.*)',
    '/catalogo(.*)',
    '/api/catalog/(.*)',
    '/track(.*)',
    '/api/track(.*)',
    '/api/os(.*)',
    '/privacidade(.*)',
    '/termos(.*)',
    // Scheduler calls; the route checks CRON_SECRET itself.
    '/api/cron/(.*)',
])

export default clerkMiddleware(async (auth, request) => {
    if (!isPublicRoute(request)) {
        await auth.protect()
    }
}, { clockSkewInMs: 300000 })

export const config = {
    matcher: [
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        '/(api|trpc)(.*)',
    ],
}
