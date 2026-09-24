import PageHeader, { primaryActionClass } from '@/components/ui/PageHeader'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { Plus, User, Phone, Mail, MapPin, ChevronRight, MoreVertical, Star, ShieldCheck } from 'lucide-react'
import { formatPhone, cn } from '@/lib/utils'
import SearchInput from '@/components/ui/SearchInput'
import CustomerActions from '@/components/customers/CustomerActions'

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
            <Header title="Base de Clientes" subtitle="Centralize informações, histórico e preferências da sua base de clientes." />

            <div className="px-4 sm:px-6 lg:px-8 pt-5 sm:pt-8 pb-10 space-y-6 max-w-screen-2xl mx-auto">

                <PageHeader
                    actions={<>
<Link
 href="/customers/new"
 className={primaryActionClass}
 >
                        Novo Cliente
                        <Plus className="w-4 h-4" />
                    </Link>
                    </>}
                />

                {/* Search and Action Bar */}
                <div className="bg-card/40 border border-border/60 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="relative flex-1 w-full md:max-w-md group">
                        <SearchInput
                            placeholder="Nome, telefone, documento ou email..."
                            className="w-full bg-muted/30 border border-border/60 rounded-2xl pl-12 pr-6 py-4 text-sm font-medium focus:outline-none focus:border-primary/30 transition-all placeholder:opacity-30 h-14"
                        />
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="flex -space-x-2">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-muted" />
                            ))}
                            <div className="w-8 h-8 rounded-full border-2 border-background bg-card flex items-center justify-center text-[11px] font-semibold text-muted-foreground">
                                +{customers?.length || 0}
                            </div>
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground">Base Consolidada</span>
                    </div>
                </div>

                {/* Customers Grid */}
                {customers && customers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {customers.map((c) => (
                            <Link
                                key={c.id}
                                href={`/customers/${c.id}`}
                                className="group relative p-8 rounded-2xl glass-premium bg-card/65 border border-border/60 hover:border-primary/30 transition-all duration-300 hover:-translate-y-2 overflow-hidden block"
                            >
                                {/* Subtle background glow */}
                                <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />

                                <div className="relative space-y-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-primary w-16 h-16 rounded-2xl border border-primary/20 flex items-center justify-center text-primary font-black text-2xl shadow-inner group-hover:scale-110 transition-transform">
                                                {c.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-lg font-black text-foreground tracking-tight line-clamp-1">{c.name}</h3>
                                                    {customers.indexOf(c) < 3 && <ShieldCheck className="w-4 h-4 text-primary" />}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                                                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                                    <span>Cliente Premium</span>
                                                </div>
                                            </div>
                                        </div>
                                        <CustomerActions customerId={c.id} customerName={c.name} />
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        {c.phone && (
                                            <div className="flex items-center gap-4 p-3 rounded-2xl bg-muted/10 border border-border/60 group-hover:bg-primary/5 transition-colors">
                                                <div className="w-8 h-8 rounded-lg bg-card border border-border/60 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                                                    <Phone className="w-4 h-4" />
                                                </div>
                                                <span className="text-xs font-mono font-bold text-foreground/60">{formatPhone(c.phone)}</span>
                                            </div>
                                        )}
                                        {c.email && (
                                            <div className="flex items-center gap-4 p-3 rounded-2xl bg-muted/10 border border-border/60 group-hover:bg-primary/5 transition-colors">
                                                <div className="w-8 h-8 rounded-lg bg-card border border-border/60 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                                                    <Mail className="w-4 h-4" />
                                                </div>
                                                <span className="text-xs font-bold text-foreground/60 truncate">{c.email}</span>
                                            </div>
                                        )}
                                        {c.city && (
                                            <div className="flex items-center gap-4 p-3 rounded-2xl bg-muted/10 border border-border/60 group-hover:bg-primary/5 transition-colors">
                                                <div className="w-8 h-8 rounded-lg bg-card border border-border/60 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                                                    <MapPin className="w-4 h-4" />
                                                </div>
                                                <span className="text-xs font-bold text-foreground/60 truncate">{c.city}, {c.state}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-4 flex items-center justify-between border-t border-border/60">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-xs font-semibold text-muted-foreground">Histórico Limpo</span>
                                        </div>
                                        <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-xl text-xs font-semibold group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                                            Acessar Perfil
                                            <ChevronRight className="w-3 h-3" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="mt-12 p-24 text-center bg-card/40 border border-border/60 rounded-2xl">
                        <div className="w-32 h-32 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-10 group hover:rotate-12 transition-transform">
                            <User className="w-16 h-16 text-primary/40" />
                        </div>
                        <h3 className="text-3xl font-black text-foreground tracking-tighter mb-4">Sua base está vazia</h3>
                        <p className="text-muted-foreground text-lg max-w-sm mx-auto mb-12">Comece a construir seu império cadastrando seu primeiro parceiro de negócios hoje.</p>
                        <Link
 href="/customers/new"
 className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-10 py-5 rounded-2xl font-semibold text-xs transition-all active:scale-95"
 >
                            <Plus className="w-6 h-6" />
                            Cadastrar Primeiro Cliente
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}

