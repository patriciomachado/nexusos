import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'
import Header from '@/components/layout/Header'
import CompanySettingsForm from '@/components/settings/CompanySettingsForm'
import { Building2, Settings, ShieldCheck, Zap, Layers, Clock, CreditCard, ChevronRight, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default async function SettingsPage() {
    const { userId } = await auth()
    const db = createAdminClient()
    const { data: user } = await db.from('users').select('company_id').eq('clerk_id', userId!).single()
    const { data: company } = await db.from('companies').select('*').eq('id', user?.company_id).single()
    const { data: serviceTypes } = await db.from('service_types').select('*').eq('company_id', user?.company_id).order('name')

    return (
        <div className="animate-fade-in pb-20 bg-background min-h-screen transition-colors duration-300">
            <Header title="Configurações do Sistema" />

            <div className="p-6 max-w-5xl mx-auto space-y-12">

                {/* Section: Company Profile */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <h2 className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em]">Perfil da Empresa</h2>
                    </div>

                    <div className="p-8 rounded-3xl bg-card/40 border border-border backdrop-blur-3xl shadow-2xl overflow-hidden relative group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full group-hover:bg-indigo-500/10 transition-colors" />
                        <CompanySettingsForm company={company} companyId={user?.company_id} />
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Section: Service Standards */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
                                <Layers className="w-5 h-5" />
                            </div>
                            <h2 className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em]">Padrões de Serviço</h2>
                        </div>

                        <div className="p-8 rounded-3xl bg-card/40 border border-border backdrop-blur-3xl shadow-2xl space-y-4">
                            {serviceTypes && serviceTypes.length > 0 ? (
                                <div className="space-y-3">
                                    {serviceTypes.map((st: any) => (
                                        <div key={st.id} className="group flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/50 hover:border-orange-500/20 hover:bg-muted/40 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center text-muted-foreground group-hover:text-orange-400 transition-colors">
                                                    <Zap className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-foreground tracking-tight group-hover:text-orange-400 transition-colors">{st.name}</p>
                                                    {st.description && <p className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-widest mt-1">{st.description}</p>}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1.5 min-w-[100px]">
                                                <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/10">
                                                    <DollarSign className="w-3 h-3" />
                                                    {formatCurrency(st.base_price)}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[9px] font-black text-rose-500/60 bg-rose-500/5 px-2 py-0.5 rounded-md border border-rose-500/5 uppercase tracking-widest">
                                                    Custo: {formatCurrency(st.base_cost || 0)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-12 text-center border-2 border-dashed border-border/10 rounded-3xl">
                                    <p className="text-sm text-muted-foreground/20 italic tracking-widest uppercase">Nenhum serviço configurado</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section: Subscription & Governance */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <h2 className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em]">Plano e Governança</h2>
                        </div>

                        <div className="p-8 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent border border-border/10 backdrop-blur-3xl shadow-2xl">
                            {company && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/10 border border-border group hover:border-emerald-500/30 transition-all">
                                        <div className="flex items-center gap-3">
                                            <CreditCard className="w-5 h-5 text-emerald-400" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">Plano Nexus OS</span>
                                        </div>
                                        <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] bg-indigo-500 text-foreground shadow-lg shadow-indigo-500/20">
                                            {company.subscription_plan}
                                        </span>
                                    </div>

                                    <div className="space-y-4 px-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-muted-foreground/40 font-medium">Status da Licença</span>
                                            <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${company.subscription_status === 'active' || company.subscription_status === 'trial' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${company.subscription_status === 'active' || company.subscription_status === 'trial' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.5)]'}`} />
                                                {company.subscription_status === 'trial' ? 'Período de Teste' : company.subscription_status === 'active' ? 'Assinatura Ativa' : 'Expirada'}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-muted-foreground/40 font-medium">Limite de Usuários</span>
                                            <span className="text-sm font-bold text-foreground tracking-widest">02 / {company.max_users.toString().padStart(2, '0')}</span>
                                        </div>

                                        <div className="pt-4 mt-4 border-t border-border/10">
                                            <button className="w-full py-4 rounded-2xl bg-muted/10 border border-border text-foreground font-bold text-xs uppercase tracking-[0.2em] hover:bg-muted/20 transition-all flex items-center justify-center gap-2">
                                                Gerenciar Assinatura
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
