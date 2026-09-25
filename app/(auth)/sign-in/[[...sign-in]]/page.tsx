import { redirect } from 'next/navigation'

/** Old login address: the app's login now lives at /entrar. */
export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(await searchParams)) {
        if (typeof v === 'string') params.set(k, v)
    }
    const qs = params.toString()
    redirect(qs ? `/entrar?${qs}` : '/entrar')
}
