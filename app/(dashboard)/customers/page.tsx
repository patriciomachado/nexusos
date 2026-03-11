import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { Plus, Search, User, Phone, Mail, MapPin, ChevronRight, MoreVertical, Star, ShieldCheck } from 'lucide-react'
import { formatPhone, cn } from '@/lib/utils'
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
            <Header title="Base de Clientes" />

            <div className="p-8 lg:p-12 max-w-screen-2xl mx-auto space-y-10">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-1 bg-primary rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">CRM & Relacionamento</span>
                        </div>
                        <h2 className="text-4xl lg:text-5xl font-black text-foreground tracking-tighter">Gestão de Clientes</h2>
                        <p className="text-muted-foreground font-medium text-lg leading-relaxed max-w-xl">Centralize informações, histórico e preferências da sua base de clientes.</p>
                    </div>
                    <Link
                        href="/customers/new"
                        className="flex items-center gap-3 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-[2rem] font-black uppercase text-xs tracking-[0.1em] shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 group"
                    >
                        Novo Cliente
                        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                    </Link>
                </div>

                {/* Search and Action Bar */}
                <div className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
                    <div className="relative flex-1 w-full md:max-w-md group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                        <SearchInput
                            placeholder="Nome, telefone, documento ou email..."
                            className="w-full bg-muted/30 border border-white/5 rounded-[1.5rem] pl-12 pr-6 py-4 text-sm font-medium focus:outline-none focus:border-primary/30 transition-all placeholder:opacity-30 h-14"
                        />
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="flex -space-x-2">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-muted bg-gradient-to-br from-indigo-500/20 to-blue-500/20" />
                            ))}
                            <div className="w-8 h-8 rounded-full border-2 border-background bg-card flex items-center justify-center text-[8px] font-black text-muted-foreground">
                                +{customers?.length || 0}
                            </div>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Base Consolidada</span>
                    </div>
                </div>

                {/* Customers Grid */}
                {customers && customers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {customers.map((c) => (
                            <Link
                                key={c.id}
                                href={`/customers/${c.id}`}
                                className="group relative p-8 rounded-[2.5rem] bg-card/40 backdrop-blur-3xl border border-white/5 hover:border-primary/30 transition-all shadow-2xl hover:-translate-y-2 overflow-hidden block"
                            >
                                {/* Subtle background glow */}
                                <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />

                                <div className="relative space-y-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-primary/10 to-blue-500/10 border border-primary/20 flex items-center justify-center text-primary font-black text-2xl shadow-inner group-hover:scale-110 transition-transform">
                                                {c.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-lg font-black text-foreground tracking-tight line-clamp-1">{c.name}</h3>
                                                    {customers.indexOf(c) < 3 && <ShieldCheck className="w-4 h-4 text-primary" />}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                                                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                                    <span>Cliente Premium</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button className="p-2 rounded-xl bg-muted/20 text-muted-foreground/20 hover:text-foreground transition-colors">
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        {c.phone && (
                                            <div className="flex items-center gap-4 p-3 rounded-2xl bg-muted/10 border border-white/5 group-hover:bg-primary/5 transition-colors">
                                                <div className="w-8 h-8 rounded-lg bg-card border border-white/5 flex items-center justify-center text-muted-foreground/40 group-hover:text-primary transition-colors">
                                                    <Phone className="w-4 h-4" />
                                                </div>
                                                <span className="text-xs font-mono font-bold text-foreground/60">{formatPhone(c.phone)}</span>
                                            </div>
                                        )}
                                        {c.email && (
                                            <div className="flex items-center gap-4 p-3 rounded-2xl bg-muted/10 border border-white/5 group-hover:bg-primary/5 transition-colors">
                                                <div className="w-8 h-8 rounded-lg bg-card border border-white/5 flex items-center justify-center text-muted-foreground/40 group-hover:text-primary transition-colors">
                                                    <Mail className="w-4 h-4" />
                                                </div>
                                                <span className="text-xs font-bold text-foreground/60 truncate">{c.email}</span>
                                            </div>
                                        )}
                                        {c.city && (
                                            <div className="flex items-center gap-4 p-3 rounded-2xl bg-muted/10 border border-white/5 group-hover:bg-primary/5 transition-colors">
                                                <div className="w-8 h-8 rounded-lg bg-card border border-white/5 flex items-center justify-center text-muted-foreground/40 group-hover:text-primary transition-colors">
                                                    <MapPin className="w-4 h-4" />
                                                </div>
                                                <span className="text-xs font-bold text-foreground/60 truncate">{c.city}, {c.state}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-4 flex items-center justify-between border-t border-white/5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">Histórico Limpo</span>
                                        </div>
                                        <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                                            Acessar Perfil
                                            <ChevronRight className="w-3 h-3" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="mt-12 p-24 text-center bg-card/40 backdrop-blur-3xl border border-white/5 rounded-[3rem] shadow-2xl">
                        <div className="w-32 h-32 rounded-[2.5rem] bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-10 group hover:rotate-12 transition-transform">
                            <User className="w-16 h-16 text-primary/40" />
                        </div>
                        <h3 className="text-3xl font-black text-foreground tracking-tighter mb-4">Sua base está vazia</h3>
                        <p className="text-muted-foreground/60 text-lg max-w-sm mx-auto mb-12">Comece a construir seu império cadastrando seu primeiro parceiro de negócios hoje.</p>
                        <Link
                            href="/customers/new"
                            className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-10 py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95"
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

