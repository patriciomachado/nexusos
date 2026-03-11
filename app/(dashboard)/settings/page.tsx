import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'
import Header from '@/components/layout/Header'
import CompanySettingsForm from '@/components/settings/CompanySettingsForm'
import ServiceTypesSettings from '@/components/settings/ServiceTypesSettings'
import SubscriptionSettings from '@/components/settings/SubscriptionSettings'
import PaymentMethodsSettings from '@/components/settings/PaymentMethodsSettings'
import { Building2, Globe, ShieldCheck } from 'lucide-react'

export default async function SettingsPage() {
    const { userId } = await auth()
    const db = createAdminClient()
    const { data: user } = await db.from('users').select('company_id, role').eq('clerk_id', userId!).single()

    if (user?.role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center space-y-8 animate-fade-in">
                <div className="p-8 rounded-[3rem] bg-rose-500/10 text-rose-500 shadow-2xl relative">
                    <div className="absolute inset-0 bg-rose-500/20 blur-[60px] rounded-full" />
                    <ShieldCheck className="w-20 h-20 relative z-10" />
                </div>
                <div className="space-y-4">
                    <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase">Barreira de Segurança</h1>
                    <p className="text-muted-foreground/60 text-lg max-w-sm mx-auto font-medium leading-relaxed">
                        Seu nível de acesso atual não permite a modificação de parâmetros estruturais do sistema.
                    </p>
                </div>
                <button className="bg-muted px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-muted/80 transition-all">Solicitar Acesso Master</button>
            </div>
        )
    }

    const { data: company } = await db.from('companies').select('*').eq('id', user?.company_id).single()

    return (
        <div className="animate-fade-in pb-20 bg-background min-h-screen transition-colors duration-300">
            <Header title="Configuração Estrutural" />

            <div className="p-8 lg:p-12 max-w-screen-2xl mx-auto space-y-20">

                {/* Section: System Identity */}
                <div className="space-y-8">
                    <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-1 bg-indigo-500 rounded-full" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500/60">Identidade Corporativa</span>
                            </div>
                            <h2 className="text-4xl lg:text-5xl font-black text-foreground tracking-tighter">Perfil do Sistema</h2>
                            <p className="text-muted-foreground font-medium text-lg leading-relaxed max-w-xl">Configure os dados que serão exibidos em ordens de serviço, recibos e comunicações oficiais.</p>
                        </div>
                        <div className="flex items-center gap-4 bg-muted/30 p-2 rounded-2xl border border-white/5">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                <Globe className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pr-4">Visibilidade Pública Online</span>
                        </div>
                    </div>

                    <div className="p-10 rounded-[3.5rem] bg-card/40 border border-white/5 backdrop-blur-3xl shadow-2xl overflow-hidden relative group">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/3 group-hover:bg-indigo-500/10 transition-colors duration-700" />
                        <CompanySettingsForm company={company} companyId={user?.company_id} />
                    </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-12">
                    {/* Section: Service Types */}
                    <div className="p-10 rounded-[3.5rem] bg-card/40 border border-white/5 backdrop-blur-3xl shadow-2xl relative overflow-hidden group hover:border-orange-500/20 transition-all duration-500">
                        <div className="absolute top-0 left-0 w-96 h-96 bg-orange-500/5 blur-[100px] rounded-full -translate-x-1/2 -translate-y-1/2 group-hover:bg-orange-500/10 transition-colors" />
                        <div className="relative z-10">
                            <ServiceTypesSettings />
                        </div>
                    </div>

                    {/* Section: Subscription */}
                    <div className="relative z-10">
                        {company && <SubscriptionSettings company={company} />}
                    </div>

                    {/* Section: Financial Gateways */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-1 bg-primary rounded-full" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Gateways de Recebimento</span>
                            </div>
                            <h2 className="text-3xl font-black text-foreground tracking-tighter">Métodos de Pagamento</h2>
                        </div>
                        <div className="p-10 rounded-[3.5rem] bg-card/40 border border-white/5 backdrop-blur-3xl shadow-2xl relative overflow-hidden group transition-all duration-500 hover:border-primary/20">
                            <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 blur-[100px] rounded-full -translate-x-1/2 -translate-y-1/2 group-hover:bg-primary/10 transition-colors" />
                            <div className="relative z-10">
                                <PaymentMethodsSettings />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

