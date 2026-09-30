import Link from 'next/link'
import {
    ArrowRight, BarChart3, Bell, Boxes, CheckCircle2, ClipboardList, HeartHandshake,
    MessageCircle, Mic, ShoppingBag, Sparkles, Store, Wallet,
} from 'lucide-react'
import { PLANS } from '@/lib/plans'
import LandingPricing from './LandingPricing'

const TRIAL_DAYS = 15

/* ─── Small building blocks ──────────────────────────────────────────────── */

function Logo() {
    return (
        <Link href="/" className="flex items-center gap-2.5" aria-label="Nexus OS, início">
            <span className="w-8 h-8 rounded-[9px] bg-white shadow-sm ring-1 ring-black/5 flex items-center justify-center overflow-hidden p-0.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img width={400} height={400} src="/logo.png" alt="" className="w-full h-full object-contain" />
            </span>
            <span className="text-[17px] font-semibold tracking-tight">Nexus OS</span>
        </Link>
    )
}

function PrimaryCta({ children = `Testar grátis por ${TRIAL_DAYS} dias`, className = '' }: { children?: React.ReactNode; className?: string }) {
    return (
        <Link href="/sign-up" className={`inline-flex items-center justify-center gap-1.5 h-12 px-6 rounded-full bg-primary text-primary-foreground text-[16px] font-semibold hover:opacity-90 transition-opacity ${className}`}>
            {children}
        </Link>
    )
}

function Section({ id, className = '', children }: { id?: string; className?: string; children: React.ReactNode }) {
    return (
        <section id={id} className={`px-4 sm:px-6 py-20 sm:py-28 scroll-mt-16 ${className}`}>
            <div className="max-w-6xl mx-auto">{children}</div>
        </section>
    )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
    return <p className="text-[15px] font-semibold text-primary">{children}</p>
}

function Title({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return <h2 className={`text-[34px] sm:text-[48px] leading-[1.08] font-semibold tracking-tight ${className}`}>{children}</h2>
}

/* ─── App mockups (built in HTML so they match the real app) ─────────────── */

const ORDERS = [
    { n: '1042', device: 'iPhone 13 · Troca de tela', who: 'Ana P.', status: 'Em reparo', tone: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' },
    { n: '1041', device: 'Galaxy A54 · Bateria', who: 'Carlos M.', status: 'Aguardando peça', tone: 'bg-orange-500/10 text-orange-700 dark:text-orange-300' },
    { n: '1039', device: 'Moto G84 · Conector', who: 'Júlia R.', status: 'Pronto para retirada', tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
    { n: '1037', device: 'iPad 9 · Diagnóstico', who: 'Pedro S.', status: 'Orçamento enviado', tone: 'bg-violet-500/10 text-violet-700 dark:text-violet-300' },
]

function Money({ reais, cents }: { reais: string; cents: string }) {
    return (
        <span className="tabular-nums">
            <span className="text-[0.55em] font-medium text-muted-foreground mr-0.5">R$</span>{reais}<span className="text-[0.55em]">,{cents}</span>
        </span>
    )
}

function HeroMockup() {
    return (
        <div className="relative mx-auto max-w-4xl" aria-hidden>
            <div className="absolute -inset-x-10 -top-10 -bottom-6 bg-[radial-gradient(60%_60%_at_50%_40%,hsl(var(--primary)/0.18),transparent_70%)] pointer-events-none" />
            <div className="relative rounded-[28px] bg-card border border-border/70 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.35)] overflow-hidden">
                <div className="h-11 flex items-center gap-2 px-4 border-b border-border/60 bg-foreground/[0.02]">
                    <span className="w-3 h-3 rounded-full bg-[#ff5f57]" /><span className="w-3 h-3 rounded-full bg-[#febc2e]" /><span className="w-3 h-3 rounded-full bg-[#28c840]" />
                    <span className="ml-3 text-[13px] text-muted-foreground">Painel · Hoje</span>
                </div>
                <div className="p-3 sm:p-6 grid grid-cols-1 gap-3 sm:gap-4 text-left min-w-0">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 min-w-0">
                        {[
                            { l: 'Faturamento do mês', v: <Money reais="18.450" cents="90" />, d: '+12% vs anterior', good: true },
                            { l: 'Lucro líquido', v: <Money reais="7.320" cents="40" />, d: 'Margem de 39,7%', good: true },
                            { l: 'OS em aberto', v: '23', d: '4 prontas para retirada', good: true },
                            { l: 'Caixa de hoje', v: <Money reais="1.286" cents="00" />, d: '9 vendas no PDV', good: true },
                        ].map(k => (
                            <div key={k.l} className="rounded-2xl bg-background border border-border/60 p-3 sm:p-3.5 min-w-0">
                                <p className="text-[12px] sm:text-[13px] text-muted-foreground truncate">{k.l}</p>
                                <p className="text-[20px] sm:text-[26px] font-semibold tracking-tight leading-tight mt-0.5 truncate">{k.v}</p>
                                <p className="text-[11px] sm:text-[12px] text-emerald-700 dark:text-emerald-400 mt-0.5 truncate">{k.d}</p>
                            </div>
                        ))}
                    </div>
                    <div className="rounded-2xl bg-background border border-border/60 min-w-0">
                        <div className="flex items-center justify-between px-3 sm:px-4 pt-3.5 pb-2">
                            <p className="text-[15px] font-semibold">Ordens de serviço</p>
                            <span className="text-[13px] text-primary font-medium">Ver todas</span>
                        </div>
                        <ul>
                            {ORDERS.map(o => (
                                <li key={o.n} className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 border-t border-border/50">
                                    <span className="hidden sm:block text-[13px] text-muted-foreground tabular-nums w-11 shrink-0">#{o.n}</span>
                                    <span className="flex-1 min-w-0">
                                        <span className="block text-[14px] font-medium truncate">{o.device}</span>
                                        <span className="block text-[12px] text-muted-foreground">{o.who}</span>
                                    </span>
                                    <span className={`text-[11px] sm:text-[12px] font-medium px-2 sm:px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 ${o.tone}`}>{o.status}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
            <p className="text-center text-[12px] text-muted-foreground mt-3">Ilustração com dados de exemplo.</p>
        </div>
    )
}

function ChatMockup() {
    return (
        <div className="rounded-[28px] bg-[#1c1c1e] border border-white/10 p-4 sm:p-5 space-y-3 max-w-md w-full mx-auto shadow-2xl" aria-hidden>
            <div className="flex items-center gap-2.5 pb-2 border-b border-white/10">
                <span className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center"><Sparkles className="w-4 h-4 text-white" /></span>
                <span className="text-[15px] font-semibold text-white">Alice</span>
                <span className="ml-auto text-[12px] text-white/50 flex items-center gap-1"><Mic className="w-3.5 h-3.5" /> voz ou texto</span>
            </div>
            <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-primary text-white px-3.5 py-2 text-[15px]">Quais aparelhos estão prontos e ninguém veio buscar?</p>
            <div className="w-fit max-w-[90%] rounded-2xl rounded-bl-md bg-white/10 text-white px-3.5 py-2.5 text-[15px] space-y-1.5">
                <p>São 4, prontos há mais de 3 dias:</p>
                <p className="text-white/80 text-[14px]">#1039 Moto G84 · Júlia R. · 5 dias<br />#1031 iPhone 11 · Marcos T. · 4 dias<br />e mais 2.</p>
                <p>Quer que eu crie uma tarefa para ligar para eles?</p>
            </div>
            <p className="ml-auto w-fit rounded-2xl rounded-br-md bg-primary text-white px-3.5 py-2 text-[15px]">Pode criar</p>
            <div className="w-fit max-w-[90%] rounded-2xl rounded-bl-md bg-white/10 text-white px-3.5 py-2.5 text-[15px] flex items-start gap-2">
                <CheckCircle2 className="w-[18px] h-[18px] text-emerald-400 mt-0.5 shrink-0" />
                <span>Pronto. Tarefa criada para hoje às 14h.</span>
            </div>
        </div>
    )
}

/* ─── Content ────────────────────────────────────────────────────────────── */

const PAINS = [
    {
        pain: 'Aparelho parado na bancada e ninguém sabe em que pé está.',
        fix: 'Cada OS tem etapa, técnico e prazo. O cliente acompanha pelo link, sem ligar para a loja.',
    },
    {
        pain: 'Caixa que não bate no fim do dia.',
        fix: 'Vendas, recebimentos, sangrias e contas fixas lançados no caixa, cada um no dia certo.',
    },
    {
        pain: 'Chega o fim do mês e você não sabe se teve lucro.',
        fix: 'Faturamento, lucro e ticket médio na tela, comparados com o período anterior.',
    },
]

const MODULES = [
    { icon: ClipboardList, title: 'Ordens de serviço', text: 'Entrada com fotos e checklist, orçamento, etapas do reparo e link de acompanhamento para o cliente.' },
    { icon: Wallet, title: 'PDV e caixa', text: 'Venda rápida no balcão, abertura e fechamento de caixa e contas fixas lançadas sozinhas.' },
    { icon: Boxes, title: 'Estoque e aparelhos', text: 'Peças, acessórios e seminovos com custo, preço e avaliação de troca.' },
    { icon: Bell, title: 'Tarefas e lembretes', text: 'Pendências da loja em um lugar, com aviso no celular na hora certa.' },
    { icon: BarChart3, title: 'Relatórios', text: 'Faturamento por dia, lucro e indicadores. No Pro: DRE, meta do mês e desempenho por técnico.' },
    { icon: HeartHandshake, title: 'Pós-venda', text: 'Avaliações dos clientes e, no Pro, a lista de quem contatar com a mensagem pronta no WhatsApp.' },
    { icon: Store, title: 'Catálogo online', text: 'Sua vitrine de aparelhos e acessórios com link próprio para divulgar.', pro: true },
    { icon: ShoppingBag, title: 'Studio de conteúdo', text: 'Ideias, roteiros e artes para redes sociais a partir dos seus serviços.', pro: true },
]

const STEPS = [
    { title: 'Crie sua conta', text: `Leva um minuto. São ${TRIAL_DAYS} dias grátis com tudo do plano Pro, sem cartão.` },
    { title: 'Cadastre o básico', text: 'Dados da loja, equipe e os produtos que você mais vende. O resto você completa no dia a dia.' },
    { title: 'Abra a primeira OS', text: 'Registre o próximo aparelho que entrar e mande o link de acompanhamento para o cliente.' },
]

const FAQ = [
    { q: 'Preciso de cartão de crédito para testar?', a: `Não. Você cria a conta e usa por ${TRIAL_DAYS} dias com tudo do plano Pro. Depois escolhe o plano e paga por Pix ou cartão.` },
    { q: 'Qual a diferença entre o Essencial e o Pro?', a: `O Essencial cobre a operação da loja: ordens de serviço, PDV, caixa, estoque, clientes, tarefas e os principais indicadores, para até ${PLANS.essencial.maxUsers} usuários. O Pro inclui a Alice (IA no app e no WhatsApp), relatórios completos, pós-venda ativo, catálogo online, Studio e usuários sem limite.` },
    { q: 'Funciona no celular?', a: 'Sim. O Nexus OS funciona no navegador do computador e do celular, e pode ser instalado na tela inicial do iPhone ou Android como um app, com lembretes por notificação.' },
    { q: 'O que a Alice faz?', a: `É a assistente de IA do plano Pro. No app, responde perguntas sobre a loja por texto ou voz e prepara ações (criar tarefa, abrir OS) que você confirma antes. No WhatsApp da loja, atende clientes: informa o status do aparelho e tira dúvidas. O plano inclui até ${PLANS.pro.aliceReplies.toLocaleString('pt-BR')} respostas por mês.` },
    { q: 'Tem fidelidade?', a: 'Não. A assinatura é mensal e você pode cancelar quando quiser. Também dá para mudar de plano a qualquer momento.' },
    { q: 'Meus dados ficam seguros?', a: 'Cada loja só enxerga os próprios dados, o acesso é feito com login individual por pessoa da equipe e cada função vê apenas o que precisa.' },
]

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function Landing() {
    return (
        <div className="min-h-screen bg-background text-foreground antialiased">
            {/* Nav */}
            <header className="sticky top-0 z-40 material-bar border-b border-border/50 pt-[env(safe-area-inset-top)]">
                <div className="max-w-6xl mx-auto h-14 px-4 sm:px-6 flex items-center gap-6">
                    <Logo />
                    <nav className="hidden md:flex items-center gap-6 text-[14px] text-muted-foreground" aria-label="Seções">
                        <a href="#recursos" className="hover:text-foreground transition-colors">Recursos</a>
                        <a href="#alice" className="hover:text-foreground transition-colors">Alice</a>
                        <a href="#planos" className="hover:text-foreground transition-colors">Planos</a>
                        <a href="#duvidas" className="hover:text-foreground transition-colors">Dúvidas</a>
                    </nav>
                    <div className="ml-auto flex items-center gap-2">
                        <Link href="/entrar" className="h-9 px-3.5 rounded-full text-[14px] font-medium inline-flex items-center hover:bg-foreground/[0.05] transition-colors">Entrar</Link>
                        <Link href="/sign-up" className="h-9 px-4 rounded-full bg-primary text-primary-foreground text-[14px] font-semibold inline-flex items-center">Testar grátis</Link>
                    </div>
                </div>
            </header>

            <main>
                {/* Hero */}
                <section className="px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-24 overflow-hidden">
                    <div className="max-w-6xl mx-auto text-center">
                        <Eyebrow>Sistema para assistências técnicas</Eyebrow>
                        <h1 className="mt-3 text-[42px] sm:text-[64px] lg:text-[76px] leading-[1.03] font-semibold tracking-tight max-w-4xl mx-auto">
                            Organização e controle da sua assistência.
                        </h1>
                        <p className="mt-5 text-[18px] sm:text-[21px] leading-relaxed text-muted-foreground max-w-2xl mx-auto">
                            Ordens de serviço, caixa, estoque e equipe no mesmo lugar. Você sabe o que entrou, o que saiu e o que falta entregar.
                        </p>
                        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                            <PrimaryCta />
                            <a href="#planos" className="inline-flex items-center gap-1 h-12 px-5 text-[16px] font-medium text-primary">
                                Ver planos <ArrowRight className="w-4 h-4" />
                            </a>
                        </div>
                        <p className="mt-3 text-[14px] text-muted-foreground">Sem cartão de crédito. Cancele quando quiser.</p>
                        <div className="mt-14 sm:mt-20">
                            <HeroMockup />
                        </div>
                    </div>
                </section>

                {/* Pains → fixes */}
                <Section className="bg-card border-y border-border/50">
                    <div className="max-w-3xl">
                        <Eyebrow>Menos correria</Eyebrow>
                        <Title className="mt-2">O que hoje fica no caderno, no WhatsApp e na memória.</Title>
                    </div>
                    <div className="mt-12 grid md:grid-cols-3 gap-4">
                        {PAINS.map(p => (
                            <div key={p.pain} className="rounded-3xl bg-background p-6 sm:p-7">
                                <p className="text-[17px] text-muted-foreground line-through decoration-muted-foreground/40">{p.pain}</p>
                                <p className="mt-4 text-[19px] leading-snug font-medium">{p.fix}</p>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* Modules */}
                <Section id="recursos">
                    <div className="text-center max-w-3xl mx-auto">
                        <Eyebrow>Tudo da loja em um app</Eyebrow>
                        <Title className="mt-2">Da entrada do aparelho ao fechamento do caixa.</Title>
                    </div>
                    <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {MODULES.map(m => (
                            <article key={m.title} className="rounded-3xl bg-card border border-border/60 p-6 flex flex-col">
                                <span className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                                    <m.icon className="w-[22px] h-[22px]" />
                                </span>
                                <h3 className="mt-4 text-[18px] font-semibold tracking-tight flex items-center gap-2">
                                    {m.title}
                                    {m.pro && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">Pro</span>}
                                </h3>
                                <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{m.text}</p>
                            </article>
                        ))}
                    </div>
                </Section>

                {/* Alice */}
                <section id="alice" className="px-4 sm:px-6 py-20 sm:py-28 bg-black text-white scroll-mt-16">
                    <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                        <div>
                            <p className="text-[15px] font-semibold text-[#a5b4fc]">Alice · plano Pro</p>
                            <h2 className="mt-2 text-[34px] sm:text-[48px] leading-[1.08] font-semibold tracking-tight">Pergunte. A Alice responde e resolve.</h2>
                            <p className="mt-5 text-[18px] leading-relaxed text-white/70">
                                A assistente de IA do Nexus OS conhece a sua loja. Pergunte por texto ou voz quanto vendeu, quais aparelhos estão atrasados ou o que tem no estoque.
                            </p>
                            <ul className="mt-8 space-y-4">
                                {[
                                    { icon: Sparkles, t: 'Consulta e age no sistema', d: 'Cria tarefas, abre e atualiza OS e agenda atendimentos. Você confirma antes de qualquer alteração.' },
                                    { icon: MessageCircle, t: 'Atende no WhatsApp da loja', d: 'Informa ao cliente o status do aparelho e responde dúvidas. Você assume a conversa quando quiser.' },
                                    { icon: CheckCircle2, t: 'Cada pessoa vê o que pode', d: 'Técnicos e atendentes usam só a parte do sistema que a função deles permite.' },
                                ].map(f => (
                                    <li key={f.t} className="flex gap-3">
                                        <f.icon className="w-5 h-5 text-[#a5b4fc] mt-1 shrink-0" />
                                        <span><span className="block text-[17px] font-medium">{f.t}</span><span className="block text-[15px] text-white/60 mt-0.5">{f.d}</span></span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <ChatMockup />
                    </div>
                </section>

                {/* How it works */}
                <Section>
                    <div className="text-center max-w-3xl mx-auto">
                        <Eyebrow>Comece hoje</Eyebrow>
                        <Title className="mt-2">Em três passos a loja está rodando.</Title>
                    </div>
                    <ol className="mt-12 grid md:grid-cols-3 gap-4">
                        {STEPS.map((s, i) => (
                            <li key={s.title} className="rounded-3xl bg-card border border-border/60 p-6 sm:p-7">
                                <span className="w-9 h-9 rounded-full bg-primary text-primary-foreground text-[15px] font-semibold flex items-center justify-center tabular-nums">{i + 1}</span>
                                <h3 className="mt-4 text-[19px] font-semibold tracking-tight">{s.title}</h3>
                                <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{s.text}</p>
                            </li>
                        ))}
                    </ol>
                </Section>

                {/* Social proof goes here once there are real customer quotes and numbers. */}

                {/* Pricing */}
                <Section id="planos" className="bg-card border-y border-border/50">
                    <div className="text-center max-w-3xl mx-auto mb-12">
                        <Eyebrow>Planos</Eyebrow>
                        <Title className="mt-2">Escolha o tamanho da sua loja.</Title>
                        <p className="mt-4 text-[18px] text-muted-foreground">Os dois começam com {TRIAL_DAYS} dias grátis de tudo do Pro. Mensal, sem fidelidade.</p>
                    </div>
                    <LandingPricing />
                </Section>

                {/* FAQ */}
                <Section id="duvidas">
                    <div className="max-w-3xl mx-auto">
                        <Title className="text-center">Dúvidas frequentes</Title>
                        <div className="mt-10 divide-y divide-border/70 border-y border-border/70">
                            {FAQ.map(f => (
                                <details key={f.q} className="group py-5">
                                    <summary className="list-none cursor-pointer flex items-center justify-between gap-4 text-[18px] font-medium [&::-webkit-details-marker]:hidden">
                                        {f.q}
                                        <span className="text-[24px] leading-none text-muted-foreground transition-transform group-open:rotate-45" aria-hidden>+</span>
                                    </summary>
                                    <p className="mt-3 text-[16px] leading-relaxed text-muted-foreground pr-8">{f.a}</p>
                                </details>
                            ))}
                        </div>
                    </div>
                </Section>

                {/* Final CTA */}
                <section className="px-4 sm:px-6 pb-24">
                    <div className="max-w-6xl mx-auto rounded-[32px] bg-primary text-primary-foreground px-6 py-14 sm:py-20 text-center">
                        <h2 className="text-[32px] sm:text-[48px] leading-[1.08] font-semibold tracking-tight max-w-3xl mx-auto">Sua assistência organizada a partir de hoje.</h2>
                        <p className="mt-4 text-[18px] text-primary-foreground/80">{TRIAL_DAYS} dias grátis, sem cartão de crédito.</p>
                        <Link href="/sign-up" className="mt-8 inline-flex items-center justify-center gap-1.5 h-12 px-7 rounded-full bg-white text-[#1d1d1f] text-[16px] font-semibold hover:opacity-90 transition-opacity">
                            Criar minha conta <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </section>
            </main>

            <footer className="border-t border-border/60 px-4 sm:px-6 py-10 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[14px] text-muted-foreground">
                    <Logo />
                    <nav className="flex items-center gap-5" aria-label="Rodapé">
                        <Link href="/termos" className="hover:text-foreground">Termos de uso</Link>
                        <Link href="/privacidade" className="hover:text-foreground">Privacidade</Link>
                        <Link href="/entrar" className="hover:text-foreground">Entrar</Link>
                    </nav>
                    <p>© {new Date().getFullYear()} Nexus OS</p>
                </div>
            </footer>
        </div>
    )
}
