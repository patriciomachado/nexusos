import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { Plus, Star, Wrench, Shield, Award, ClipboardList, Phone, ChevronRight, MoreVertical } from 'lucide-react'

export default async function TechniciansPage() {
    const { userId } = await auth()
    if (!userId) redirect('/sign-in')

    const db = createAdminClient()
    const { data: currentUser } = await db.from('users').select('role').eq('clerk_id', userId).single()
    if (currentUser?.role === 'technician' || currentUser?.role === 'cashier' || currentUser?.role === 'attendant') {
        redirect('/dashboard')
    }

    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId!).single()
    const { data: technicians } = await db
        .from('technicians')
        .select('*')
        .eq('company_id', user?.company_id)
        .eq('is_active', true)
        .order('name')

    return (
        <div className="animate-fade-in pb-12 bg-background min-h-screen transition-colors duration-300">
            <Header title="Equipe Técnica" />

            <div className="p-6 max-w-7xl mx-auto space-y-6">
                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground tracking-tight">Especialistas e Técnicos</h2>
                        <p className="text-foreground/60 mt-1">
                            Você tem <span className="text-orange-400 font-semibold">{technicians?.length || 0} profissionais ativos</span> na sua equipe.
                        </p>
                    </div>
                    <Link
                        href="/technicians/new"
                        className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-foreground px-6 py-3 rounded-xl font-medium shadow-[0_4px_20px_rgba(245,158,11,0.3)] transition-all hover:-translate-y-0.5"
                    >
                        <Plus className="w-5 h-5" />
                        Novo Técnico
                    </Link>
                </div>

                {/* Technicians Grid */}
                {technicians && technicians.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                        {technicians.map((t: any) => (
                            <Link
                                key={t.id}
                                href={`/technicians/${t.id}`}
                                className="group relative p-6 rounded-2xl bg-card border border-border hover:border-orange-500/30 transition-all shadow-lg hover:shadow-orange-500/10 hover:-translate-y-1 overflow-hidden"
                            >
                                {/* Glow effect */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-[50px] rounded-full group-hover:bg-orange-500/10 transition-colors" />

                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-border flex items-center justify-center text-orange-400 font-bold text-2xl shadow-inner relative overflow-hidden">
                                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_100%)] opacity-20" />
                                                {t.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-foreground group-hover:text-orange-400 transition-colors truncate max-w-[150px]">
                                                    {t.name}
                                                </h3>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <div className="flex items-center text-yellow-500">
                                                        <Star className="w-3.5 h-3.5 fill-current" />
                                                        <span className="text-xs font-bold ml-1">{t.performance_rating?.toFixed(1) || '0.0'}</span>
                                                    </div>
                                                    <span className="text-foreground/20 px-1">•</span>
                                                    <span className="text-xs text-foreground/40">{t.total_os_completed || 0} OS</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button className="p-2 text-foreground/20 hover:text-muted-foreground/60 transition-colors">
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {/* Specialties */}
                                    {t.specialties && t.specialties.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-6">
                                            {(t.specialties as string[]).slice(0, 3).map((s: string) => (
                                                <span key={s} className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="mt-auto space-y-3">
                                        {t.phone && (
                                            <div className="flex items-center gap-3 text-sm text-foreground/50">
                                                <Phone className="w-4 h-4 opacity-40" />
                                                <span className="font-mono">{t.phone}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3 text-sm text-foreground/50">
                                            <ClipboardList className="w-4 h-4 opacity-40" />
                                            <span>Membro desde {new Date(t.created_at).getFullYear()}</span>
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-5 border-t border-border/10 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Disponível</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-orange-400 text-xs font-semibold group-hover:translate-x-1 transition-transform">
                                            Dashboard <ChevronRight className="w-3.5 h-3.5" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="mt-12 p-20 text-center bg-muted/40 backdrop-blur-md border border-border rounded-3xl">
                        <div className="w-24 h-24 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-8 shadow-inner">
                            <Wrench className="w-12 h-12 text-orange-400/50" />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-3">Nenhum técnico cadastrado</h3>
                        <p className="text-foreground/50 text-lg max-w-md mx-auto mb-10">Sua equipe ainda não possui profissionais cadastrados no sistema.</p>
                        <Link
                            href="/technicians/new"
                            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-foreground px-8 py-4 rounded-xl font-bold shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all"
                        >
                            <Plus className="w-5 h-5" />
                            Cadastrar Primeiro Técnico
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}
