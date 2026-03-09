import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import {
  Zap, Shield, BarChart3, Clock, Users, Package,
  CheckCircle, ArrowRight, Star, ChevronRight
} from 'lucide-react'

export default async function LandingPage() {
  const { userId } = await auth()
  if (userId) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden transition-colors duration-500">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Nexus OS</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Planos</a>
            <a href="#about" className="hover:text-foreground transition-colors">Sobre</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2">
              Entrar
            </Link>
            <Link href="/sign-up" className="text-sm bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-colors font-medium">
              Grátis por 7 dias
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm mb-6">
            <Star className="w-3.5 h-3.5" />
            <span>Plataforma #1 para assistências técnicas</span>
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6">
            Gerencie sua{' '}
            <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">assistência técnica</span>
            <br />com inteligência
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
            Centralize operações, automatize processos, controle finanças e acompanhe técnicos em tempo real.
            Tudo em um único sistema, do celular ao desktop.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/sign-up" className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-xl text-lg font-medium transition-all hover:scale-105 shadow-xl shadow-primary/20">
              Começar grátis
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/sign-in" className="flex items-center gap-2 border border-border hover:border-foreground/20 text-foreground/80 px-8 py-4 rounded-xl text-lg transition-colors bg-card/50 backdrop-blur-sm">
              Fazer login
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground/40">7 dias grátis · Sem cartão de crédito</p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 border-y border-border bg-muted/20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '10.000+', label: 'Assistências ativas' },
              { value: '500k+', label: 'OS gerenciadas' },
              { value: '99.9%', label: 'Uptime garantido' },
              { value: '4.9★', label: 'Avaliação média' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-bold text-primary mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Tudo que você precisa</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Uma plataforma completa com todas as ferramentas para administrar sua assistência técnica com eficiência.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Zap className="w-6 h-6" />,
                title: 'Ordens de Serviço',
                desc: 'Crie, gerencie e acompanhe OS em tempo real. Status dinâmicos, checklists e histórico completo.',
                color: 'blue',
              },
              {
                icon: <Clock className="w-6 h-6" />,
                title: 'Agendamento Inteligente',
                desc: 'Calendário visual, roteirização automática e notificações automáticas para clientes.',
                color: 'purple',
              },
              {
                icon: <Users className="w-6 h-6" />,
                title: 'Gestão de Técnicos',
                desc: 'Controle de especialidades, disponibilidade, desempenho e comissões.',
                color: 'green',
              },
              {
                icon: <Package className="w-6 h-6" />,
                title: 'Controle de Estoque',
                desc: 'Entradas e saídas automáticas, alertas de estoque mínimo e relatórios.',
                color: 'yellow',
              },
              {
                icon: <BarChart3 className="w-6 h-6" />,
                title: 'Financeiro Completo',
                desc: 'Controle de caixa, pagamentos, contas a pagar e relatórios financeiros.',
                color: 'orange',
              },
              {
                icon: <Shield className="w-6 h-6" />,
                title: 'Seguro e Confiável',
                desc: 'Autenticação robusta com Clerk, RLS no Supabase e backups automáticos diários.',
                color: 'red',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="p-8 rounded-3xl border border-border/50 bg-card/40 hover:bg-card hover:border-primary/30 transition-all group shadow-xl backdrop-blur-xl"
              >
                <div className={`w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform shadow-inner`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4 bg-muted/20 border-y border-border">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Planos simples e transparentes</h2>
            <p className="text-muted-foreground">Escolha o plano ideal para o tamanho da sua equipe</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                name: 'Essencial',
                price: 'R$ 99,90',
                users: '3 usuários',
                badge: null,
                features: ['Gestão de OS', 'Controle de estoque', 'Caixa e financeiro', 'Dashboard em tempo real', 'Suporte completo'],
              },
              {
                name: 'Profissional',
                price: 'R$ 139,90',
                users: '5 usuários',
                badge: 'Mais popular',
                features: ['Tudo do Essencial', 'Contas a pagar', 'Relatórios por e-mail', 'Import XML fornecedor', 'Controle de comissão'],
              },
              {
                name: 'Avançado',
                price: 'R$ 169,90',
                users: '10 usuários',
                badge: null,
                features: ['Tudo do Profissional', 'Estoque por IMEI/série', 'Assistente com IA', 'Relatório DRE', 'Metas de vendas'],
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`p-8 rounded-3xl border relative flex flex-col shadow-2xl backdrop-blur-xl transition-all hover:-translate-y-1 ${plan.badge
                  ? 'border-primary bg-card ring-1 ring-primary/20'
                  : 'border-border/50 bg-card/40 hover:bg-card'
                  }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                    {plan.badge}
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
                  <p className="text-3xl font-bold">{plan.price}<span className="text-lg text-muted-foreground font-normal">/mês</span></p>
                  <p className="text-sm text-muted-foreground mt-1">{plan.users}</p>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-foreground/70">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/sign-up"
                  className={`block text-center py-3 rounded-xl font-medium transition-colors ${plan.badge
                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20'
                    : 'border border-border hover:border-foreground/20 text-foreground'
                    }`}
                >
                  Começar grátis
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center mt-8 text-muted-foreground/40 text-sm">Todos os planos incluem 7 dias grátis. Cancele quando quiser.</p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Pronto para transformar sua assistência?</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Comece gratuitamente e descubra como o Nexus OS pode aumentar sua produtividade.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-xl text-lg font-medium transition-all hover:scale-105 shadow-2xl shadow-primary/20"
          >
            Começar agora — grátis
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 bg-muted/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">Nexus OS</span>
          </div>
          <p className="text-muted-foreground/40 text-sm">© 2026 Nexus OS. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
