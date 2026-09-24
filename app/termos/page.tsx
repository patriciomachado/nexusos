import Link from 'next/link'
import { FileText, ArrowLeft, Shield, CheckCircle2, Lock } from 'lucide-react'

export const metadata = {
    title: 'Termos de Uso — Nexus OS',
    description: 'Leia os Termos de Uso da plataforma Nexus OS e saiba como funcionam nossos planos, licenças e responsabilidades.',
}

export default function TermsOfUsePage() {
    return (
        <div className="min-h-screen bg-[#0a0a0f] text-slate-100 font-sans selection:bg-indigo-500/30">
            {/* Background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px]" />
            </div>

            {/* Header / Navigation */}
            <header className="relative z-10 h-20 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 px-4 md:px-8 flex items-center justify-between">
                <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group text-xs font-black text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Voltar para o Início
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
                            N
                        </div>
                        <span className="font-black text-sm tracking-tight text-white uppercase tracking-widest">Nexus OS</span>
                    </div>
                </div>
            </header>

            {/* Content Section */}
            <main className="relative z-10 max-w-4xl mx-auto px-4 py-12 md:py-20 space-y-12">
                <div className="space-y-4 text-center">
                    <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto text-indigo-400 border border-indigo-500/20 shadow-[0_0_45px_rgba(99,102,241,0.15)]">
                        <FileText className="w-8 h-8" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">Termos de Uso</h1>
                    <p className="text-slate-400 font-medium max-w-xl mx-auto text-sm md:text-base">
                        Leia atentamente as condições e regras aplicáveis ao uso da plataforma de gestão Nexus OS.
                    </p>
                    <div className="inline-flex gap-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 pt-2">
                        <span>Última atualização: 16 de julho de 2026</span>
                        <span>&bull;</span>
                        <span>Versão: 1.1</span>
                    </div>
                </div>

                <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 md:p-10 shadow-2xl space-y-8 backdrop-blur-xl">
                    
                    {/* Section 1 */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-black text-indigo-400 flex items-center gap-2">
                            <span className="text-xs bg-indigo-500/15 px-2 py-0.5 rounded text-indigo-400 font-mono">1</span>
                            Aceitação dos Termos
                        </h2>
                        <p className="text-sm text-slate-300 leading-relaxed">
                            Ao criar uma conta ou utilizar a plataforma Nexus OS, você declara que leu, compreendeu e concorda integralmente com estes Termos de Uso e com a nossa Política de Privacidade. Caso não concorde com qualquer uma das condições estabelecidas, você não deverá utilizar o sistema.
                        </p>
                    </div>

                    {/* Section 2 */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-black text-indigo-400 flex items-center gap-2">
                            <span className="text-xs bg-indigo-500/15 px-2 py-0.5 rounded text-indigo-400 font-mono">2</span>
                            Sobre a Plataforma Nexus OS
                        </h2>
                        <p className="text-sm text-slate-300 leading-relaxed">
                            O Nexus OS é um software como serviço (SaaS) voltado para a gestão integrada de assistências técnicas. O sistema permite o controle de ordens de serviço, fluxo financeiro, ordens de compra, relatórios, cadastros e acompanhamento de status em tempo real por meio de um portal exclusivo para o cliente final. A plataforma está disponível como um Progressive Web App (PWA) de alta performance.
                        </p>
                    </div>

                    {/* Section 3 */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-black text-indigo-400 flex items-center gap-2">
                            <span className="text-xs bg-indigo-500/15 px-2 py-0.5 rounded text-indigo-400 font-mono">3</span>
                            Definições Principais
                        </h2>
                        <ul className="space-y-3 pl-4 text-sm text-slate-300">
                            <li><strong>Plataforma:</strong> O ecossistema Nexus OS, incluindo seu aplicativo, APIs, banco de dados e portais de rastreamento.</li>
                            <li><strong>Usuário:</strong> O proprietário, técnico ou funcionário de uma assistência técnica cadastrada na plataforma.</li>
                            <li><strong>Cliente Final:</strong> O cliente da assistência técnica, cujos dados e equipamentos são registrados na plataforma pelo Usuário.</li>
                            <li><strong>Dados:</strong> Qualquer tipo de informação cadastrada, gerada ou armazenada pelo Usuário na plataforma.</li>
                        </ul>
                    </div>

                    {/* Section 4 */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-black text-indigo-400 flex items-center gap-2">
                            <span className="text-xs bg-indigo-500/15 px-2 py-0.5 rounded text-indigo-400 font-mono">4</span>
                            Cadastro, Contas e Segurança
                        </h2>
                        <p className="text-sm text-slate-300 leading-relaxed">
                            Para usufruir dos recursos da plataforma, o Usuário deve criar uma conta com dados autênticos e mantê-los atualizados. Cada conta é de uso pessoal e intransferível. O Usuário é inteiramente responsável por salvaguardar suas credenciais de acesso (Clerk Auth) e por qualquer atividade realizada por meio de suas credenciais ou sob contas de colaboradores por ele criadas. Qualquer suspeita de acesso não autorizado deve ser reportada de imediato ao nosso suporte.
                        </p>
                    </div>

                    {/* Section 5 */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-black text-indigo-400 flex items-center gap-2">
                            <span className="text-xs bg-indigo-500/15 px-2 py-0.5 rounded text-indigo-400 font-mono">5</span>
                            Planos, Assinaturas e Cobranças
                        </h2>
                        <ul className="space-y-2 pl-4 text-sm text-slate-300">
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                                <span><strong>Período de Testes:</strong> Disponibilizamos um período de teste gratuito de 15 dias para novos cadastros, sem necessidade de cartão de crédito.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                                <span><strong>Assinaturas e Pagamentos:</strong> O Nexus OS oferece planos recorrentes com faturamento mensal. As cobranças e assinaturas são administradas de forma segura e transparente por parceiros integrados (Stripe/Hotmart).</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                                <span><strong>Cancelamento:</strong> O Usuário pode solicitar o cancelamento a qualquer momento diretamente nas configurações de conta. O plano permanecerá ativo até o fim do ciclo de faturamento contratado e pago.</span>
                            </li>
                        </ul>
                    </div>

                    {/* Section 6 */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-black text-indigo-400 flex items-center gap-2">
                            <span className="text-xs bg-indigo-500/15 px-2 py-0.5 rounded text-indigo-400 font-mono">6</span>
                            Responsabilidades de Proteção de Dados (LGPD)
                        </h2>
                        <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
                            <p>
                                <strong>Papel do Usuário (Controlador):</strong> O Usuário reconhece que, ao cadastrar dados de seus Clientes Finais (como nome, contato, CPF e defeitos em aparelhos), atua como Controlador perante a LGPD. O Usuário deve assegurar base legal legítima de tratamento e fornecer transparência quanto ao uso dos dados dos seus Clientes Finais.
                            </p>
                            <p>
                                <strong>Papel do Nexus OS (Operador):</strong> O Nexus OS atua como Operador de dados pessoais, limitando-se a processar as informações para viabilizar as funcionalidades da plataforma conforme as configurações de conta do Usuário. Nós implementamos as defesas de segurança cibernética cabíveis e mantemos backups seguros para proteger esses dados.
                            </p>
                        </div>
                    </div>

                    {/* Section 7 */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-black text-indigo-400 flex items-center gap-2">
                            <span className="text-xs bg-indigo-500/15 px-2 py-0.5 rounded text-indigo-400 font-mono">7</span>
                            Propriedade Intelectual
                        </h2>
                        <p className="text-sm text-slate-300 leading-relaxed">
                            Todos os direitos de propriedade intelectual da plataforma Nexus OS (incluindo código-fonte, elementos visuais, design de interface, marcas, logotipos e bancos de dados proprietários) pertencem integralmente a nós. O Usuário possui uma licença temporária, revogável, não exclusiva e intransferível para uso da plataforma nos limites do plano contratado. Os dados e arquivos enviados pelo Usuário continuam sendo de propriedade do próprio Usuário.
                        </p>
                    </div>

                    {/* Section 8 */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-black text-indigo-400 flex items-center gap-2">
                            <span className="text-xs bg-indigo-500/15 px-2 py-0.5 rounded text-indigo-400 font-mono">8</span>
                            Limitação de Responsabilidade
                        </h2>
                        <p className="text-sm text-slate-300 leading-relaxed">
                            A plataforma é fornecida "como está" (as is) e "conforme disponível". Não garantimos que a plataforma estará 100% livre de interrupções, bugs ou instabilidades decorrentes de falhas gerais de internet. Não nos responsabilizamos por perdas financeiras, lucros cessantes, decisões de negócios baseadas em relatórios ou condutas indevidas adotadas pelo Usuário ou seus funcionários. A responsabilidade financeira total máxima do Nexus OS perante o Usuário limita-se à soma das mensalidades pagas nos últimos 12 meses.
                        </p>
                    </div>

                    {/* Section 9 */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-black text-indigo-400 flex items-center gap-2">
                            <span className="text-xs bg-indigo-500/15 px-2 py-0.5 rounded text-indigo-400 font-mono">9</span>
                            Retenção e Exclusão pós-Cancelamento
                        </h2>
                        <p className="text-sm text-slate-300 leading-relaxed">
                            Após o cancelamento definitivo da conta, os dados do Usuário serão mantidos nos servidores por até 90 dias caso haja interesse em reativação da conta. Transcorridos os 90 dias, os dados de faturamento e registros de clientes são retidos em backup inativo por até 5 anos para cumprimento de obrigações contábeis e fiscais do Nexus OS, sendo deletados definitivamente em seguida.
                        </p>
                    </div>

                    {/* Section 10 */}
                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <h2 className="text-base font-black text-white">Suporte e Dúvidas</h2>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Caso tenha qualquer dúvida referente aos Termos de Uso ou necessite de assistência, por favor, entre em contato através dos nossos canais de suporte ou e-mail:
                        </p>
                        <div className="text-sm font-semibold text-indigo-400">
                            Nexus Tecnologia LTDA <br />
                            E-mail: <a href="mailto:contato@nexusos.com.br" className="underline hover:text-indigo-300 transition-colors">contato@nexusos.com.br</a>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 border-t border-white/5 bg-[#0a0a0f]/50 py-8 text-center text-[11px] font-bold uppercase tracking-widest text-[#505060]">
                © 2026 Nexus OS. Todos os direitos reservados.
            </footer>
        </div>
    )
}
