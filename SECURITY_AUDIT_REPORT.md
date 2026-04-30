# Security Audit Report - Nexus OS

## Executive summary
- **Project**: Nexus OS
- **Framework detected**: Next.js (App Router)
- **Audit date**: 2026-04-29
- **Overall assessment**: **Caution**. O projeto possui uma base sólida com autenticação Clerk, mas apresenta riscos críticos de IDOR (Insecure Direct Object Reference) especificamente na camada de ferramentas de IA (AI Tools) e inconsistências na validação de entrada nas bordas da API.

## Scope
- **Paths reviewed**: `app/api/**/*`, `lib/ai/tools.ts`, `lib/security.ts`, `components/forms/*`
- **High-risk areas prioritized**: Integração com IA, Handlers de API, Controle de Tenancy (Multi-empresa).

## Findings

### Critical
- **Title**: Vulnerabilidade de IDOR em AI Tools via `company_id` manipulável
- **Severity**: Critical
- **Confidence**: High
- **Status**: Confirmed
- **Evidence**: Em `lib/ai/tools.ts`, todas as ferramentas (ex: `manage_os`, `manage_customers`) aceitam `company_id` como parâmetro de entrada do esquema do Zod.
- **Impact**: Um usuário malintencionado pode realizar um ataque de Prompt Injection para convencer o agente de IA a utilizar um `company_id` de outra empresa, acessando ou modificando dados sensíveis de terceiros, já que as ferramentas utilizam `SUPABASE_SERVICE_ROLE_KEY` (bypass de RLS).
- **Affected files**: [tools.ts](file:///c:/Users/Support/Desktop/Nexus/nexus-os/lib/ai/tools.ts)
- **Recommended fix**: Remover o `company_id` do `inputSchema` das ferramentas. O `company_id` deve ser injetado no contexto da ferramenta a partir da sessão do usuário autenticado no servidor, nunca vindo da definição da ferramenta que o LLM preenche.

### High
- **Title**: Ausência de validação formal (Zod) em bordas de API (Server Boundary)
- **Severity**: High
- **Confidence**: High
- **Status**: Confirmed
- **Evidence**: Rotas como `app/api/cash-transactions/route.ts` e `app/api/service-orders/route.ts` processam o `body` do request com verificações manuais simples ou sem validação completa.
- **Impact**: Injeção de dados malformados ou inesperados que podem causar erros de processamento ou estados inconsistentes no banco de dados.
- **Affected files**: [cash-transactions/route.ts](file:///c:/Users/Support/Desktop/Nexus/nexus-os/app/api/cash-transactions/route.ts), [service-orders/route.ts](file:///c:/Users/Support/Desktop/Nexus/nexus-os/app/api/service-orders/route.ts)
- **Recommended fix**: Implementar schemas Zod para todas as entradas de API e utilizar `safeParse()` antes de processar qualquer lógica de negócio.

- **Title**: Implementação inconsistente de Tenancy (Multi-empresa)
- **Severity**: High
- **Confidence**: Medium
- **Status**: Confirmed
- **Evidence**: Algumas rotas utilizam o novo helper `getContext()` em `lib/security.ts`, enquanto outras ainda buscam o `company_id` manualmente do banco de dados a cada request.
- **Impact**: Risco de "vazamento" de lógica onde uma rota futura pode esquecer de filtrar por `company_id`, resultando em exposição de dados.
- **Affected files**: [service-orders/route.ts](file:///c:/Users/Support/Desktop/Nexus/nexus-os/app/api/service-orders/route.ts)
- **Recommended fix**: Padronizar o uso de `getContext()` em todas as rotas de API e Server Actions para garantir que o `companyId` seja sempre derivado da sessão Clerk de forma centralizada.

### Medium
- **Title**: Uso de `SUPABASE_SERVICE_ROLE_KEY` em ambiente compartilhado
- **Severity**: Medium
- **Confidence**: High
- **Status**: Confirmed
- **Evidence**: `lib/ai/tools.ts` utiliza a chave de serviço administrativa para todas as operações.
- **Impact**: Qualquer falha na lógica de validação do código (como o IDOR citado acima) resulta em acesso total ao banco de dados sem a proteção das Row Level Security (RLS).
- **Affected files**: [tools.ts](file:///c:/Users/Support/Desktop/Nexus/nexus-os/lib/ai/tools.ts)
- **Recommended fix**: Avaliar se as ferramentas podem operar com uma chave de usuário limitada, respeitando as políticas de RLS, ou garantir que o contexto injetado seja 100% seguro.

## Manual review items
- Verificar se as rotas de administração (`app/api/admin/*`) possuem proteção de middleware Clerk além da verificação interna.
- Validar se o upload de fotos em `service-orders` possui restrições de tipo de arquivo e tamanho no servidor.

## Remediation roadmap
- **Immediate**: Corrigir `lib/ai/tools.ts` para não aceitar `company_id` via parâmetro do LLM.
- **This week**: Refatorar `app/api/service-orders` e `app/api/cash-transactions` para usar `getContext()` e schemas Zod.
- **This month**: Auditoria completa de RLS no Supabase para garantir que, mesmo com falhas no Next.js, os dados estejam protegidos no nível do banco.
