import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getContext } from '@/lib/security'
import { TASK_ROLES } from '@/lib/tasks/access'
import Header from '@/components/layout/Header'
import TasksClient from '@/components/tasks/TasksClient'

export const metadata = { title: 'Tarefas · Nexus OS' }

export default async function TarefasPage() {
    const ctx = await getContext()
    if (!ctx) redirect('/sign-in')
    // The Tarefas module is personal to the shop's administrator.
    if (!TASK_ROLES.includes(ctx.role)) redirect('/dashboard')

    return (
        <div className="min-h-screen bg-background">
            <Header title="Tarefas" />
            <Suspense>
                <TasksClient />
            </Suspense>
        </div>
    )
}
