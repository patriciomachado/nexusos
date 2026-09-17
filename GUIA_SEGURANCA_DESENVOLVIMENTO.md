# Guia de Boas Práticas e Padrões de Segurança para Projetos Web (Next.js / TypeScript)

Este documento foi criado com base nas vulnerabilidades e falhas de segurança investigadas, corrigidas e validadas no projeto **Nexus OS**. Ele serve como um **guia arquitetural e checklist de desenvolvimento** para que novas aplicações e microsserviços já nasçam imunes a estes problemas.

---

## 📋 Sumário
1. [Gerenciamento de Dependências e Transitividade](#1-gerenciamento-de-dependências-e-transitividade)
2. [Geração de Números Aleatórios e Identificadores (PRNG vs CPRNG)](#2-geração-de-números-aleatórios-e-identificadores-prng-vs-cprng)
3. [Tratamento de Erros e Prevenção de Exposição de Informações (Information Disclosure)](#3-tratamento-de-erros-e-prevenção-de-exposição-de-informações-information-disclosure)
4. [Formatação Segura de Logs (Unsafe Format String)](#4-formatação-segura-de-logs-unsafe-format-string)
5. [Gerenciamento de Segredos e Credenciais](#5-gerenciamento-de-segredos-e-credenciais)
6. [Checklist Rápido para Novos Projetos](#6-checklist-rápido-para-novos-projetos)

---

## 1. Gerenciamento de Dependências e Transitividade

### O Problema
Vulnerabilidades conhecidas (CVEs) em bibliotecas diretas ou subdependências transitivas expõem a aplicação a Denial of Service (DoS), Server-Side Request Forgery (SSRF), Remote Code Execution (RCE) e Bypasses de Autenticação.

### Vulnerabilidades Investigadas
- **Next.js (`< 16.3.5`)**: Vulnerável a DoS por consumo excessivo de memória/CPU, SSRF no carregamento de imagens e Bypass de autorização em rotas estáticas.
- **@clerk/nextjs (`< 7.2.4`) e @clerk/shared (`< 4.8.3`)**: Vulneráveis a bypass de verificação de sessão (`CVE-2026-41248`, `CVE-2026-42349`).
- **PostCSS (`< 8.5.18`)**: Path Traversal e consumo inadequado de memória (`CVE-2026-45623`).
- **Sharp (`< 0.35.0`)**: Buffer Overflow / RCE na biblioteca nativa `libvips` (`CVE-2026-33327`).
- **ws (`< 8.20.1`)**: DoS em conexões WebSocket não finalizadas (`CVE-2026-48779`).
- **js-cookie (`< 3.0.7`)**: Prototype Pollution via Parsing de Cookies maliciosos (`CVE-2026-46625`).
- **js-yaml (`< 4.3.2`)**: CPU DoS por complexidade quadrática no parsing (`CVE-2026-48991`).

### Diretriz para Novos Projetos
1. **Trava de Versões Transitivas com `overrides`**: Sempre declare no `package.json` o bloco de `overrides` (ou `resolutions` no Yarn/pnpm) para garantir que subdependências não instalem versões vulneráveis:
```json
{
  "overrides": {
    "postcss": "^8.5.18",
    "sharp": "^0.35.0",
    "ws": "^8.20.1",
    "js-cookie": "^3.0.7",
    "brace-expansion": "^2.0.1",
    "browserslist": "^4.28.7",
    "flatted": "^3.4.2",
    "js-yaml": "^4.3.2",
    "@humanfs/node": "^0.16.8"
  }
}
```
2. **Executar Auditoria Semanal**: Integrar `npm audit` ou dependabot no pipeline de CI/CD para interromper builds com vulnerabilidades severas/críticas.

---

## 2. Geração de Números Aleatórios e Identificadores (PRNG vs CPRNG)

### O Problema (`node_insecure_random_generator`)
O uso de `Math.random()` utiliza um Gerador de Números Pseudo-Aleatórios (PRNG) determinístico e previsível. Se usado para tokens de API, chaves de sessão, IDs de transação ou chaves de integração, um atacante pode prever os valores gerados.

### Diretriz para Novos Projetos

❌ **Incorreto (Inseguro):**
```typescript
// NUNCA use Math.random para IDs, tokens ou chaves
const token = Math.random().toString(36).substring(2);
const itemId = `item_${Math.random()}`;
```

✅ **Correto (Criptograficamente Seguro - CPRNG):**
- **Para IDs de Entidades e Chaves Únicas:**
```typescript
// Use a API nativa do Web/Node Crypto
const uniqueId = crypto.randomUUID();
```

- **Para Tokens de API / Chaves Secretas:**
```typescript
function generateSecureToken(length = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
```

> 💡 **Exceção Aceitável**: `Math.random()` só é permitido para **efeitos gráficos visuais de UI** (posicionamento de partículas 3D, animações de confetes, cores aleatórias em telas de apresentação).

---

## 3. Tratamento de Erros e Prevenção de Exposição de Informações (Information Disclosure)

### O Problema (`generic_error_disclosure`)
Imprimir o objeto de erro bruto (`console.error(error)`) ou retornar mensagens de erro detalhadas do banco de dados (ex.: conexões Supabase, chamadas SQL, stack traces) para o cliente expõe detalhes de infraestrutura, nomes de tabelas, colunas e credenciais.

### Diretriz para Novos Projetos

❌ **Incorreto (Vaza detalhes internos no console do cliente ou respostas API):**
```typescript
try {
  await db.from('users').delete().eq('id', userId);
} catch (error) {
  console.error(error); // Imprime stack trace, nomes de tabela/banco no console
  alert(`Erro no banco: ${error.message}`);
}
```

✅ **Correto (Mensagens de Erro Genéricas e Sanitizadas):**
```typescript
try {
  await db.from('users').delete().eq('id', userId);
} catch (error) {
  // Em produção, registre apenas mensagens seguras ou envie para um APM seguro (ex: Sentry)
  console.error("Falha ao remover usuário da base de dados.");
  
  // Apresente ao usuário uma mensagem amigável e segura
  toast.error("Não foi possível concluir a operação. Tente novamente mais tarde.");
}
```

---

## 4. Formatação Segura de Logs (Unsafe Format String)

### O Problema (`unsafe-formatstring`)
Passar objetos ou strings formatadas via Template Literals diretamente no primeiro argumento de funções de log (`console.error(\`Falha no item ${id}: ${err}\`)`) pode ser interpretado incorretamente por formatadores de log e causar substituições indesejadas de `%s`, `%o` ou vazamento de objetos internos complexos.

### Diretriz para Novos Projetos

❌ **Incorreto:**
```typescript
console.error(`Erro ao processar a despesa ${expenseId}: ${err}`);
```

✅ **Correto (Passar argumentos separados):**
```typescript
console.error("Erro ao processar a despesa", expenseId, err);
```

---

## 5. Gerenciamento de Segredos e Credenciais

### O Problema (`secrets`)
Manter tokens de API, chaves de banco de dados, senhas de serviço ou webhooks commitados diretamente no código-fonte (.ts, .json, .env commitado).

### Diretriz para Novos Projetos
1. **Nunca commitar arquivos `.env` ou `.env.local`**.
2. **Utilizar Variáveis de Ambiente no Servidor**:
   - Chaves públicas (ex: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`) só devem expor informações que o cliente realmente necessita.
   - Chaves secretas (ex: `CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) NUNCA podem ter o prefixo `NEXT_PUBLIC_`.
3. **Audit de Commits**: Utilizar ferramentas como `git-secrets` ou hooks de pre-commit para bloquear commit contendo chaves/tokens identificáveis.

---

## 6. Checklist Rápido para Novos Projetos

Ao iniciar qualquer nova aplicação Web/Next.js/TypeScript, certifique-se de:

- [ ] Incluir o bloco de `overrides` de pacotes vulneráveis conhecidos no `package.json`.
- [ ] Rodar `npm audit` antes de subir para staging/produção.
- [ ] Substituir todo `Math.random()` por `crypto.randomUUID()` / `crypto.getRandomValues()` para qualquer regra de negócio, token ou ID.
- [ ] Tratar `catch` blocks ocultando detalhes internos do banco ou infraestrutura e exibindo mensagens amigáveis.
- [ ] Formatar chamadas de `console.error` utilizando múltiplos argumentos separados por vírgula em vez de template strings.
- [ ] Verificar se nenhum segredo/token está gravado diretamente no código fonte ou subido para o repositório Git.

---
*Documento gerado como especificação de segurança com base nas correções e auditorias do projeto Nexus OS.*
