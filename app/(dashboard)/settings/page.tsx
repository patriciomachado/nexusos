import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
    Banknote, Bell, BellRing, Blocks, Building2, Calculator, ChevronRight, Clock, CreditCard, Database, Download, FileText, Landmark, MessageCircle,
    Smartphone, Sparkles, Store, Upload, UserCheck, Users, Wallet, Wand2,
} from 'lucide-react'
import Header from '@/components/layout/Header'
import { SettingsRow, SettingsSection } from '@/components/settings/SettingsList'
import { getContext } from '@/lib/security'
import { isOwner } from '@/lib/cash/server'
import { getCompanyPlan } from '@/lib/plan-server'
import { PLANS } from '@/lib/plans'
import { listStores } from '@/lib/stores/server'
import { offModules } from '@/lib/modules'

/** Settings hub in the iPhone "Ajustes" layout: every setting of the store in one list. */
export default async function SettingsPage() {
    const ctx = await getContext()
    if (!ctx) redirect('/entrar')
    const { db, companyId, role, userId } = ctx
    const owner = isOwner(role)

    const [{ data: company }, plan, stores] = await Promise.all([
        db.from('companies').select('name, logo_url, city, state, parent_company_id, settings').eq('id', companyId).single(),
        getCompanyPlan(db, companyId),
        listStores(db, userId, companyId, role).catch(() => []),
    ])

    const offCount = offModules(company?.settings).length

    return (
        <div className="min-h-full bg-background">
            <Header title="Configurações" />
            <div className="max-w-2xl mx-auto px-4 pt-4 pb-16 space-y-6">
                <Link href={owner ? '/settings/loja' : '/profile'} className="flex items-center gap-4 rounded-2xl bg-card border border-border/60 p-4 hover:bg-foreground/[0.02] transition-colors">
                    {company?.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img width={56} height={56} src={company.logo_url} alt="" className="w-14 h-14 rounded-full object-cover bg-white border border-border/60" />
                    ) : (
                        <span className="w-14 h-14 rounded-full bg-primary/10 text-primary text-[22px] font-semibold flex items-center justify-center">{company?.name?.charAt(0)?.toUpperCase() ?? 'N'}</span>
                    )}
                    <span className="flex-1 min-w-0">
                        <span className="block text-[20px] font-semibold truncate">{company?.name ?? 'Minha loja'}</span>
                        <span className="block text-[14px] text-muted-foreground truncate">
                            {[company?.parent_company_id ? 'Filial' : stores.length > 1 ? 'Matriz' : null, [company?.city, company?.state].filter(Boolean).join(' - ') || null, `Plano ${PLANS[plan].name}`].filter(Boolean).join(' · ')}
                        </span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
                </Link>

                {owner ? (
                    <>
                        <SettingsSection>
                            <SettingsRow href="/settings/loja" icon={Building2} color="bg-blue-500" label="Dados da loja" detail="Nome, logo, endereço, garantia e avaliação" />
                            <SettingsRow href="/settings/lojas" icon={Store} color="bg-indigo-500" label="Lojas e filiais" value={stores.length > 1 ? `${stores.length} lojas` : undefined} />
                            <SettingsRow href="/settings/subscription" icon={Sparkles} color="bg-violet-500" label="Plano" value={PLANS[plan].name} />
                        </SettingsSection>

                        <SettingsSection title="Vendas e dinheiro">
                            <SettingsRow href="/settings/precos" icon={Calculator} color="bg-amber-500" label="Preços" detail="Custo da hora, lucro e tabela de serviços" />
                            <SettingsRow href="/settings/pagamentos" icon={CreditCard} color="bg-emerald-500" label="Formas de pagamento" />
                            <SettingsRow href="/cash-register?ajustes=1" icon={Wallet} color="bg-green-600" label="Caixa e maquininha" detail="Taxas, limite de sangria, senha do dono e relatório" />
                            <SettingsRow href="/contas" icon={Landmark} color="bg-teal-600" label="Contas a pagar e receber" />
                        </SettingsSection>

                        <SettingsSection title="Documentos">
                            <SettingsRow href="/settings/documentos" icon={FileText} color="bg-orange-500" label="Recibo e OS" detail="Cores, logo, textos e termos impressos" />
                        </SettingsSection>

                        <SettingsSection title="Pessoas">
                            <SettingsRow href="/team" icon={Users} color="bg-sky-500" label="Equipe" detail="Convites, comissões e metas" />
                            <SettingsRow href="/team?tab=perms" icon={UserCheck} color="bg-cyan-600" label="Permissões por função" />
                            <SettingsRow href="/team?tab=clock" icon={Clock} color="bg-slate-500" label="Ponto" />
                        </SettingsSection>

                        <SettingsSection title="Clientes e WhatsApp">
                            <SettingsRow href="/alice" icon={MessageCircle} color="bg-green-500" label="Alice e WhatsApp" detail="Assistente de IA e número conectado" />
                            <SettingsRow href="/customers?automacoes=1" icon={Bell} color="bg-rose-500" label="Mensagens automáticas" detail="Aniversário, pós-venda e revisão" />
                        </SettingsSection>

                        <SettingsSection title="Dados" footer="Exporte planilhas quando quiser e guarde um backup completo da loja.">
                            <SettingsRow href="/settings/exportar" icon={Download} color="bg-blue-600" label="Exportar e backup" />
                            <SettingsRow href="/settings/import" icon={Upload} color="bg-zinc-500" label="Importar dados" />
                        </SettingsSection>

                        <SettingsSection title="Sistema">
                            <SettingsRow href="/settings/notificacoes" icon={BellRing} color="bg-red-500" label="Notificações" detail="Lembretes no celular, câmera e microfone" />
                            <SettingsRow href="/settings/modulos" icon={Blocks} color="bg-purple-500" label="Módulos" detail="Ligar e desligar partes do app" value={offCount ? `${offCount} desligado${offCount > 1 ? 's' : ''}` : undefined} />
                            <SettingsRow href="/dashboard?configurar=1" icon={Wand2} color="bg-fuchsia-500" label="Assistente de configuração" />
                            <SettingsRow href="/settings/tela" icon={Smartphone} color="bg-zinc-600" label="Diagnóstico da tela" detail="Quando o app aparece cortado no celular" />
                        </SettingsSection>
                    </>
                ) : (
                    <>
                        <SettingsSection>
                            <SettingsRow href="/team?tab=clock" icon={Clock} color="bg-slate-500" label="Meu ponto" />
                            <SettingsRow href="/settings/notificacoes" icon={BellRing} color="bg-red-500" label="Notificações" detail="Lembretes no celular, câmera e microfone" />
                            {stores.length > 1 && <SettingsRow href="/settings/lojas" icon={Store} color="bg-indigo-500" label="Trocar de loja" value={`${stores.length} lojas`} />}
                            {role === 'manager' && <SettingsRow href="/settings/exportar" icon={Database} color="bg-blue-600" label="Exportar planilhas" />}
                            {role === 'manager' && <SettingsRow href="/contas" icon={Banknote} color="bg-teal-600" label="Contas a pagar e receber" />}
                            <SettingsRow href="/settings/tela" icon={Smartphone} color="bg-zinc-600" label="Diagnóstico da tela" />
                        </SettingsSection>
                        <p className="px-4 text-[13px] text-muted-foreground">Os demais ajustes da loja ficam com o dono.</p>
                    </>
                )}
            </div>
        </div>
    )
}
