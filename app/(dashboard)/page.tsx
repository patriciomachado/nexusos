import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'

export default async function DashboardIndexPage() {
    const { userId } = await auth()
    if (!userId) redirect('/entrar')
    redirect('/dashboard')
}
