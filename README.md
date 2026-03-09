# Nexus OS - Sistema de Gestão Inteligente

Nexus OS é uma plataforma premium de gestão para assistências técnicas, focada em performance, estética e facilidade de uso em dispositivos móveis.

## 🚀 Principais Recursos

- **Dashboard Neuro-Design**: Interface de alta performance com KPIs em tempo real.
- **📱 Experiência Mobile Nativa**: Navegação por abas inferior e layout edge-to-edge otimizado para celulares.
- **⚙️ Gestão de OS**: Fluxo completo desde a entrada até o faturamento.
- **📄 Termos de Garantia**: Sistema de aceite digital de termos integrado ao rastreio do cliente.
- **💰 PDV & Financeiro**: Módulo de vendas e fluxo de caixa simplificado.
- **🌓 Sistema de Temas**: Suporte total a modo claro e escuro (Glassmorphism).

## 🛠️ Stack Tecnológica

- **Front-end**: Next.js 15+ (App Router), Tailwind CSS 4+
- **Back-end/Banco**: Supabase (PostgreSQL)
- **Autenticação**: Clerk
- **UI/UX**: Lucide Icons, Recharts, Framer Motion (Transições)

## 📦 Como Rodar Localmente

1. Clone o repositório:
   ```bash
   git clone https://github.com/patriciomachado/nexusos.git
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Configure o arquivo `.env.local` com suas chaves do Supabase e Clerk.
4. Inicie o servidor:
   ```bash
   npm run dev
   ```

## 🌐 Deploy na Vercel

O projeto está pronto para ser enviado à Vercel. Certifique-se de configurar todas as variáveis de ambiente listadas no `deployment_guide.md`.
