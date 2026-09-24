import PageHeader from '@/components/ui/PageHeader'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase'
import Header from '@/components/layout/Header'
import CompanySettingsForm from '@/components/settings/CompanySettingsForm'
import SubscriptionSettings from '@/components/settings/SubscriptionSettings'
import PaymentMethodsSettings from '@/components/settings/PaymentMethodsSettings'
import AliceIntegrationSettings from '@/components/settings/AliceIntegrationSettings'
import { Building2, Globe, ShieldCheck } from 'lucide-react'

export default async function SettingsPage() {
    const { userId } = await auth()
    const db = createAdminClient()
    const { data: user } = await db.from('users').select('company_id, role').eq('clerk_id', userId!).single()

    if (user?.role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center space-y-8 animate-fade-in">
                <div className="p-8 rounded-2xl bg-rose-500/10 text-rose-500 relative">
                    <div className="absolute inset-0 bg-rose-500/20 blur-[60px] rounded-full" />
                    <ShieldCheck className="w-20 h-20 relative z-10" />
                </div>
                <div className="space-y-4">
                    <h1 className="text-[28px] sm:text-[34px] leading-tight font-black text-foreground tracking-tighter">Barreira de Segurança</h1>
                    <p className="text-muted-foreground text-lg max-w-sm mx-auto font-medium leading-relaxed">
                        Seu nível de acesso atual não permite a modificação de parâmetros estruturais do sistema.
                    </p>
                </div>
                <button className="bg-muted px-8 py-4 rounded-2xl font-semibold text-[13px] hover:bg-muted/80 transition-all">Solicitar Acesso Master</button>
            </div>
        )
    }

    const { data: company } = await db.from('companies').select('*').eq('id', user?.company_id).single()

    return (
        <div className="animate-fade-in pb-20 bg-background min-h-screen transition-colors duration-300">
            <Header title="Configuração Estrutural" />

            <div className="px-4 sm:px-6 lg:px-8 pt-5 sm:pt-8 pb-10 space-y-12 max-w-screen-2xl mx-auto">

                {/* Section: System Identity */}
                <div className="space-y-6">
                    <PageHeader
                        eyebrow="Identidade Corporativa"
                        title="Perfil do Sistema"
                        subtitle="Configure os dados que serão exibidos em ordens de serviço, recibos e comunicações oficiais."
                    />

                    <div className="p-10 rounded-2xl glass-premium bg-card/65 border border-border/60 overflow-hidden relative group transition-all duration-300">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/3 group-hover:bg-indigo-500/10 transition-colors duration-700" />
                        <CompanySettingsForm company={company} companyId={user?.company_id} />
                    </div>
                </div>

                {/* Section: Alice AI Integration */}
                <div className="space-y-8">
                    <AliceIntegrationSettings company={company} companyId={user?.company_id} />
                </div>

                <div className="grid lg:grid-cols-2 gap-12">
                    {/* Section: Subscription */}
                    <div className="relative z-10">
                        {company && <SubscriptionSettings company={company} />}
                    </div>

                    {/* Section: Financial Gateways */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-primary/60">Gateways de Recebimento</span>
                            </div>
                            <h2 className="text-3xl font-black text-foreground tracking-tighter">Métodos de Pagamento</h2>
                        </div>
                        <div className="p-10 rounded-2xl glass-premium bg-card/65 border border-border/60 relative overflow-hidden group transition-all duration-300 hover:border-primary/20">
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

