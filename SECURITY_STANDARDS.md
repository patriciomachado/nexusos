# Diretrizes e Boas Práticas de Segurança para Projetos Web

Este documento serve como um guia padrão e checklist de segurança para o desenvolvimento de aplicações web robustas e seguras. Ele detalha as 10 verificações essenciais descritas nas diretrizes de segurança de áudio, acompanhadas de exemplos e explicações técnicas adaptadas para ambientes modernos (como Next.js e Supabase).

---

## 📋 Checklist de Segurança (10 Pontos + Dica Extra)

### 1. Segredos e Chaves de API no Backend (Nunca no Frontend)
* **Conceito:** Qualquer dado presente no código lido pelo navegador (JavaScript cliente) pode ser inspecionado por qualquer usuário malintencionado.
* **Boa Prática:**
  * Armazene credenciais (chaves de serviços de e-mail, tokens de IA, senhas de banco de dados) em variáveis de ambiente (`.env.local`).
  * Em projetos Next.js, **nunca** adicione o prefixo `NEXT_PUBLIC_` a variáveis que contenham segredos confidenciais. Apenas chaves públicas inofensivas (como a URL pública do Supabase) devem conter este prefixo.
  * Utilize rotas de API (Route Handlers) ou Server Actions para intermediar comunicações com serviços externos confidenciais.

---

### 2. Integridade de Preços e Dados (Cálculos no Banco de Dados)
* **Conceito:** O cliente (frontend) é um ambiente hostil e totalmente manipulável através das ferramentas do desenvolvedor (F12 / Inspector).
* **Boa Prática:**
  * **Nunca confie nos preços, custos ou totais finais enviados diretamente pelo frontend.**
  * Ao realizar um pedido, venda ou transação, envie apenas os identificadores dos itens (`inventory_item_id`) e as quantidades.
  * No servidor (API), busque o valor real de venda direto do banco de dados e recalcule o preço unitário, subtotal, descontos e valor final.
  * **Exemplo implementado em `/api/sales/route.ts`:**
    ```typescript
    // Busca o preço real do banco de dados para cada item
    const { data: stockItem } = await db
        .from('inventory_items')
        .select('selling_price')
        .eq('id', item.inventory_item_id)
        .single();

    const unitPrice = stockItem.selling_price;
    const itemTotalPrice = unitPrice * item.quantity;
    calculatedTotalAmount += itemTotalPrice;
    ```

---

### 3. Exibição de Dados Sob Demanda (Mascaramento de Dados Sensíveis)
* **Conceito:** Expor dados pessoais (como CPF, CNPJ, e-mail completo ou telefone) em páginas públicas de acesso livre (sem login) facilita roubo de identidade e engenharia social.
* **Boa Prática:**
  * Exiba apenas o que for estritamente necessário nas páginas de acesso público.
  * Mascare dados sensíveis antes de enviá-los ao cliente.
  * **Exemplo (Mascaramento de Telefone):**
    ```typescript
    const maskPhone = (phone: string) => {
        if (!phone) return '';
        // Retorna apenas os primeiros e últimos dígitos mascarando o meio
        return phone.slice(0, 5) + '*****' + phone.slice(-4);
    };
    ```

---

### 4. Validação de Entrada e Higienização (Anti-XSS e Anti-Injection)
* **Conceito:** Inputs do usuário que não passam por validação podem conter scripts JavaScript maliciosos (XSS - Cross-Site Scripting) ou código de injeção que compromete o banco de dados.
* **Boa Prática:**
  * Valide formalmente o formato de todas as entradas nas bordas da sua API usando schemas estruturados (como **Zod**).
  * Use parametrização de queries para evitar SQL Injection (ORMs como Prisma/Drizzle ou o cliente do Supabase já fazem isso por padrão).
  * Escape caracteres HTML se for renderizar textos digitados livremente pelo usuário para mitigar XSS.

---

### 5. Autenticação e Autorização Centralizadas no Backend
* **Conceito:** O frontend apenas requisita o acesso e exibe a interface de acordo com as permissões atuais do usuário. A decisão final de conceder ou negar acesso aos dados é de responsabilidade exclusiva do backend.
* **Boa Prática:**
  * Proteja as rotas de API verificando tokens de sessão JWT (via middlewares como Clerk, NextAuth ou cookies cookies seguros).
  * Se o token for inválido ou ausente, retorne imediatamente um erro HTTP `401 Unauthorized`.
  * Nunca envie dados confidenciais sob a premissa de que "o frontend irá escondê-los se o usuário não for admin".

---

### 6. Logs de Auditoria Confiáveis
* **Conceito:** Sem logs confiáveis, é impossível rastrear invasões, diagnosticar abusos ou entender como um incidente de segurança ocorreu.
* **Boa Prática:**
  * Registre ações importantes no sistema (criação de registros, alterações de privilégios, tentativas de login malsucedidas).
  * Utilize uma tabela dedicada para o histórico de auditoria (ex: `service_order_history` no Nexus OS) contendo quem alterou, quando e qual era o valor antigo e o novo.

---

### 7. Limitação de Taxa de Requisição (Rate Limiting)
* **Conceito:** APIs públicas sem limites de requisições são alvos fáceis de ataques de força bruta (tentativas de adivinhar senhas, PINs ou tokens de rastreamento) e ataques de negação de serviço (DDoS).
* **Boa Prática:**
  * Configure rate limiters específicos para rotas críticas (como login, recuperação de senha, checkout e endpoints públicos de rastreamento de OS).
  * **Exemplo de Rate Limiter In-Memory implementado em `/lib/security-rate-limit.ts` e usado nas APIs de Rastreamento:**
    ```typescript
    const ip = getClientIp(req);
    if (!rateLimit('accept-terms', 5, 60000, ip)) {
        return NextResponse.json({ error: 'Muitas solicitações.' }, { status: 429 });
    }
    ```

---

### 8. Configuração Correta do CORS (Cross-Origin Resource Sharing)
* **Conceito:** A política de CORS define quais origens (domínios) têm permissão para ler recursos da sua API através do navegador.
* **Boa Prática:**
  * Evite usar cabeçalhos como `Access-Control-Allow-Origin: *` em endpoints de escrita ou leitura de dados confidenciais.
  * Restrinja o CORS apenas para os domínios oficiais da sua aplicação (ex: `https://www.nexusgestor.com`).

---

### 9. Isolamento de Dados (Row Level Security - RLS)
* **Conceito:** O RLS controla quem pode ler ou alterar cada linha do seu banco de dados. Sem o RLS habilitado em tabelas com dados sensíveis, qualquer pessoa com acesso à chave pública (`anon` key) pode ler e modificar os dados de todos os usuários do banco.
* **Boa Prática:**
  * **Habilitação Obrigatória:** Ative o RLS em **todas** as tabelas do Supabase (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`).
  * **Atenção a Políticas Abertas:** Evite manter políticas de teste (ex: `USING (true)`) em produção. Isso anula a proteção do RLS, mesmo com ele ativado.
  * **Bypass de RLS via Service Role:** Lembre-se de que a **Service Role Key** é a chave mestra e ignora todas as políticas de RLS. **Essa chave nunca deve aparecer no código do frontend ou ser exportada em variáveis públicas.** Se ela vazar, qualquer pessoa terá acesso irrestrito de leitura e escrita ao banco de dados.
  * No backend, utilize helpers centrais (como o `getContext()` no Nexus OS) para extrair o `companyId` seguro diretamente da sessão criptografada do usuário e filtre todas as queries explicitamente.

---

### 10. Gerenciamento Seguro de Sessões (Logout e Invalidação)
* **Conceito:** Quando um usuário clica em sair (Logout), todos os tokens associados à sua sessão devem ser invalidados. Se a sessão persistir no servidor ou em cookies antigos, o acesso continua vulnerável.
* **Boa Prática:**
  * Configure cookies de sessão com as propriedades `HttpOnly` (impede leitura via JS), `Secure` (apenas tráfego HTTPS) e `SameSite=Lax` ou `Strict`.
  * Ao efetuar o logout, invalide os refresh tokens correspondentes no banco de dados da autenticação e limpe os cookies no navegador do cliente.

---

### 💡 Dica Extra: Versionamento Seguro (Git / GitHub)
* **Conceito:** Ter o projeto versionado em um repositório seguro com boas práticas de commits garante a recuperação rápida contra desastres de código e vazamento acidental de chaves.
* **Boa Prática:**
  * Adicione arquivos `.env` e pastas temporárias ao `.gitignore` antes de realizar o primeiro commit.
  * Em caso de deploy problemático ou incidente, utilize as ferramentas do Git para realizar rollbacks rápidos (`git revert` ou `git reset`).
