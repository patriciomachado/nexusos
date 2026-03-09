import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { Plus, Search, User, Phone, Mail, MapPin, ChevronRight, MoreVertical } from 'lucide-react'
import { formatDate, formatPhone } from '@/lib/utils'
import SearchInput from '@/components/ui/SearchInput'

export default async function CustomersPage({
    searchParams,
}: {
    searchParams: Promise<{ search?: string }>
}) {
    const { userId } = await auth()
    if (!userId) redirect('/sign-in')

    const db = createAdminClient()
    const { data: currentUser } = await db.from('users').select('role').eq('clerk_id', userId).single()

    if (currentUser?.role === 'customer') {
        redirect('/dashboard')
    }

    const { search } = await searchParams
    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId!).single()

    let query = db
        .from('customers')
        .select('*')
        .eq('company_id', user?.company_id)
        .eq('is_active', true)

    if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    const { data: customers } = await query.order('name')

    return (
        <div className="animate-fade-in pb-12 bg-background min-h-screen transition-colors duration-300">
            <Header title="Gestão de Clientes" />

            <div className="p-6 max-w-7xl mx-auto space-y-6">
                {/* Search and Action Bar */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="w-full md:w-96">
                        <SearchInput
                            placeholder="Buscar clientes por nome, telefone ou email..."
                            className="w-full bg-muted/60 border border-border rounded-xl py-3 pl-11 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all backdrop-blur-md"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <p className="hidden md:block text-sm text-foreground/40 mr-2">
                            <span className="text-foreground font-semibold">{customers?.length || 0}</span> clientes cadastrados
                        </p>
                        <Link
                            href="/customers/new"
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-foreground px-5 py-3 rounded-xl font-medium shadow-[0_4px_20px_rgba(99,102,241,0.4)] transition-all hover:-translate-y-0.5"
                        >
                            <Plus className="w-5 h-5" />
                            Novo Cliente
                        </Link>
                    </div>
                </div>

                {/* Customers Grid */}
                {customers && customers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {customers.map((c) => (
                            <Link
                                key={c.id}
                                href={`/customers/${c.id}`}
                                className="group relative p-6 rounded-2xl bg-card border border-border hover:border-indigo-500/30 transition-all shadow-lg hover:shadow-indigo-500/10 hover:-translate-y-1 overflow-hidden"
                            >
                                {/* Gradient hover effect */}
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                <div className="relative z-10">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-border flex items-center justify-center text-indigo-400 font-bold text-xl shadow-inner">
                                            {c.name.charAt(0).toUpperCase()}
                                        </div>
                                        <button className="p-2 text-foreground/20 hover:text-foreground/60 transition-colors">
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <h3 className="text-lg font-bold text-foreground group-hover:text-indigo-400 transition-colors mb-4 truncate">
                                        {c.name}
                                    </h3>

                                    <div className="space-y-3">
                                        {c.phone && (
                                            <div className="flex items-center gap-3 text-sm text-foreground/50">
                                                <div className="w-8 h-8 rounded-lg bg-muted/5 flex items-center justify-center">
                                                    <Phone className="w-3.5 h-3.5" />
                                                </div>
                                                <span className="font-mono">{formatPhone(c.phone)}</span>
                                            </div>
                                        )}
                                        {c.email && (
                                            <div className="flex items-center gap-3 text-sm text-foreground/50">
                                                <div className="w-8 h-8 rounded-lg bg-muted/5 flex items-center justify-center">
                                                    <Mail className="w-3.5 h-3.5" />
                                                </div>
                                                <span className="truncate">{c.email}</span>
                                            </div>
                                        )}
                                        {c.city && (
                                            <div className="flex items-center gap-3 text-sm text-foreground/50">
                                                <div className="w-8 h-8 rounded-lg bg-muted/5 flex items-center justify-center">
                                                    <MapPin className="w-3.5 h-3.5" />
                                                </div>
                                                <span className="truncate">{c.city}, {c.state}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-border/10 flex items-center justify-between text-xs">
                                        <span className="text-foreground/30 uppercase tracking-widest font-semibold">Cliente Ativo</span>
                                        <div className="flex items-center gap-1 text-indigo-400 font-medium group-hover:translate-x-1 transition-transform">
                                            Ver Perfil <ChevronRight className="w-3.5 h-3.5" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="mt-12 p-20 text-center bg-card/40 backdrop-blur-md border border-border rounded-3xl">
                        <div className="w-24 h-24 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-8 shadow-inner">
                            <User className="w-12 h-12 text-indigo-400/50" />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-3">Nenhum cliente por aqui</h3>
                        <p className="text-foreground/50 text-lg max-w-md mx-auto mb-10">Você ainda não tem clientes cadastrados na sua base de dados.</p>
                        <Link
                            href="/customers/new"
                            className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-foreground px-8 py-4 rounded-xl font-bold shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all"
                        >
                            <Plus className="w-5 h-5" />
                            Cadastrar Primeiro Cliente
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}
