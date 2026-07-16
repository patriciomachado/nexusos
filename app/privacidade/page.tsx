import Link from 'next/link'
import { Shield, ArrowLeft, Lock, FileText, CheckCircle2 } from 'lucide-react'

export const metadata = {
    title: 'Política de Privacidade — Nexus OS',
    description: 'Saiba como o Nexus OS coleta, processa, armazena e protege seus dados em conformidade com a LGPD.',
}

export default function PrivacyPolicyPage() {
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
                    <Link href="/" className="flex items-center gap-2 group text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
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
                    <div className="w-16 h-16 bg-indigo-500/10 rounded-[1.5rem] flex items-center justify-center mx-auto text-indigo-400 border border-indigo-500/20 shadow-[0_0_45px_rgba(99,102,241,0.15)]">
                        <Shield className="w-8 h-8" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">Política de Privacidade</h1>
                    <p className="text-slate-400 font-medium max-w-xl mx-auto text-sm md:text-base">
                        Saiba como coletamos, utilizamos, armazenamos e protegemos seus dados pessoais em conformidade com a LGPD.
                    </p>
                    <div className="inline-flex gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 pt-2">
                        <span>Última atualização: 16 de julho de 2026</span>
                        <span>&bull;</span>
                        <span>Versão: 1.1</span>
                    </div>
                </div>

                <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 md:p-10 shadow-2xl space-y-8 backdrop-blur-xl">
                    
                    {/* Section 1 */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                            <span className="text-xs bg-indigo-500/15 px-2 py-0.5 rounded text-indigo-400 font-mono">1</span>
                            Introdução
                        </h2>
                        <p className="text-sm text-slate-300 leading-relaxed">
                            O Nexus OS ("nós") valoriza a privacidade e a proteção dos dados pessoais de seus usuários e dos clientes das assistências técnicas que utilizam nosso sistema. Esta Política de Privacidade descreve como coletamos, utilizamos, armazenamos e protegemos as informações pessoais, em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018 — LGPD).
                        </p>
                    </div>

                    {/* Section 2 */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                            <span className="text-xs bg-indigo-500/15 px-2 py-0.5 rounded text-indigo-400 font-mono">2</span>
                            Quem Somos e Nossos Papéis na LGPD
                        </h2>
                        <p className="text-sm text-slate-300 leading-relaxed">
                            O Nexus OS é um sistema de gestão (SaaS) para assistências técnicas de dispositivos eletrônicos. No contexto da LGPD:
                        </p>
                        <ul className="space-y-2 pl-4 text-sm text-slate-300">
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                                <span><strong>Operador:</strong> O Nexus OS atua como OPERADOR dos dados pessoais dos clientes das assistências técnicas.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                                <span><strong>Controlador:</strong> A assistência técnica (nosso Usuário) atua como CONTROLADORA dos dados de seus próprios clientes, sendo a responsável direta por coletar o consentimento e definir as bases legais de tratamento.</span>
                            </li>
                        </ul>
                    </div>

                    {/* Section 3 */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                            <span className="text-xs bg-indigo-500/15 px-2 py-0.5 rounded text-indigo-400 font-mono">3</span>
                            Dados que Coletamos
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">3.1. Dados do Usuário (Dono/Funcionário da Assistência):</h3>
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    Nome completo, e-mail de autenticação, telefone/WhatsApp corporativo, dados cadastrais da empresa (nome, CNPJ, endereço, logotipo) e dados de cobrança e assinatura.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">3.2. Dados dos Clientes Finais (Inseridos pelo Usuário):</h3>
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    Nome completo, telefone, e-mail, CPF/CNPJ, endereço, detalhes do equipamento (marca, modelo, IMEI/número de série, cor, estado físico), checklist de testes de entrada e saída, senha ou padrão gráfico de desbloqueio do dispositivo (fornecidos voluntariamente para execução técnica) e histórico financeiro dos serviços prestados.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">3.3. Dados Coletados Automaticamente:</h3>
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    Tipo de dispositivo, sistema operacional, resolução de tela, navegador, endereço IP e dados de marketing (parâmetros UTM, referrer — coletados apenas no ato do cadastro).
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Section 4 */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                            <span className="text-xs bg-indigo-500/15 px-2 py-0.5 rounded text-indigo-400 font-mono">4</span>
                            Como Utilizamos os Dados
                        </h2>
                        <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
                            <p>
                                <strong>Dados do Usuário:</strong> Utilizados exclusivamente para operar a plataforma, gerenciar assinaturas e enviar avisos técnicos, alertas de faturamento e atualizações do sistema.
                            </p>
                            <p>
                                <strong>Dados dos Clientes Finais:</strong> Processados estritamente para viabilizar as ferramentas de gerenciamento (geração e impressão de OS, checklists, envio automático de mensagens de status via WhatsApp, relatórios financeiros e de estoque). O Nexus OS não utiliza esses dados para finalidade própria, publicidade ou compartilhamento indevido.
                            </p>
                        </div>
                    </div>

                    {/* Section 5 */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                            <span className="text-xs bg-indigo-500/15 px-2 py-0.5 rounded text-indigo-400 font-mono">5</span>
                            Bases Legais de Tratamento
                        </h2>
                        <p className="text-sm text-slate-300 leading-relaxed">
                            Processamos dados pessoais apenas sob bases legais legítimas, incluindo:
                        </p>
                        <ul className="space-y-2 pl-4 text-sm text-slate-300">
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                                <span><strong>Execução de Contrato:</strong> Necessário para a prestação dos serviços contratados entre o Usuário e a plataforma, e entre o Cliente e a assistência.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                                <span><strong>Consentimento:</strong> Para coleta de informações voluntárias durante o cadastro e autorizações de termos.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                                <span><strong>Cumprimento de Obrigação Legal:</strong> Retenção de dados contábeis e fiscais decorrentes de cobranças ou obrigações de consumo.</span>
                            </li>
                        </ul>
                    </div>

                    {/* Section 6 */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                            <span className="text-xs bg-indigo-500/15 px-2 py-0.5 rounded text-indigo-400 font-mono">6</span>
                            Segurança dos Dados e Infraestrutura
                        </h2>
                        <p className="text-sm text-slate-300 leading-relaxed">
                            Adotamos rígidos padrões de segurança técnica para proteger os dados armazenados:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold uppercase tracking-wider text-slate-400 pt-2">
                            <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl flex items-center gap-3">
                                <Lock className="w-5 h-5 text-indigo-400 shrink-0" />
                                <span>Isolamento lógico de dados por loja (Supabase RLS)</span>
                            </div>
                            <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl flex items-center gap-3">
                                <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
                                <span>Criptografia de senhas (pgcrypto com AES-256)</span>
                            </div>
                            <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl flex items-center gap-3">
                                <Shield className="w-5 h-5 text-indigo-400 shrink-0" />
                                <span>Servidores em nuvem de alta segurança (Supabase - São Paulo)</span>
                            </div>
                            <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl flex items-center gap-3">
                                <Lock className="w-5 h-5 text-indigo-400 shrink-0" />
                                <span>Acesso condicional e restrição de rate limiting</span>
                            </div>
                        </div>
                    </div>

                    {/* Section 7 */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                            <span className="text-xs bg-indigo-500/15 px-2 py-0.5 rounded text-indigo-400 font-mono">7</span>
                            Prazos de Retenção e Exclusão Automática
                        </h2>
                        <ul className="space-y-3 pl-4 text-sm text-slate-300">
                            <li>
                                <strong>Senhas de aparelhos:</strong> Apagadas de forma irreversível e automática do sistema <strong>48 horas após a conclusão/entrega da OS</strong>.
                            </li>
                            <li>
                                <strong>Fotos de Ordens de Serviço:</strong> Mantidas conforme o prazo configurado pelo Usuário nas configurações da loja (padrão: 1 ano), enviando avisos automáticos de exclusão com 30 dias de antecedência.
                            </li>
                            <li>
                                <strong>Dados cadastrais após cancelamento:</strong> Guardados por até 90 dias para permitir reativação de conta e, posteriormente, mantidos por até 5 anos para cumprimento de obrigações contábeis e fiscais (Art. 27 do CDC), sendo apagados definitivamente depois.
                            </li>
                        </ul>
                    </div>

                    {/* Section 8 */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                            <span className="text-xs bg-indigo-500/15 px-2 py-0.5 rounded text-indigo-400 font-mono">8</span>
                            Direitos dos Titulares dos Dados
                        </h2>
                        <p className="text-sm text-slate-300 leading-relaxed">
                            Usuários da plataforma podem solicitar acesso, correção, eliminação de dados tratados sob consentimento, portabilidade ou revogação de consentimento a qualquer momento. Os Clientes Finais devem direcionar suas solicitações de exclusão diretamente à assistência técnica contratada (Controlador), que usará as ferramentas do sistema para executar a limpeza.
                        </p>
                    </div>

                    {/* Section 9 */}
                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <h2 className="text-base font-black uppercase tracking-wider text-white">Contato e Dúvidas</h2>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Se você tiver dúvidas sobre nossa Política de Privacidade ou precisar exercer seus direitos, por favor entre em contato com nosso Encarregado de Proteção de Dados (DPO):
                        </p>
                        <div className="text-sm font-semibold text-indigo-400">
                            Nexus Tecnologia LTDA <br />
                            E-mail: <a href="mailto:contato@nexusos.com.br" className="underline hover:text-indigo-300 transition-colors">contato@nexusos.com.br</a>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 border-t border-white/5 bg-[#0a0a0f]/50 py-8 text-center text-[10px] font-bold uppercase tracking-widest text-[#505060]">
                © 2026 Nexus OS. Todos os direitos reservados.
            </footer>
        </div>
    )
}
