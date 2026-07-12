# SKILL: Auditoria e Otimização de Performance/Build (sem quebrar nada)

> Cole este documento inteiro como prompt/instrução para o Antigravity. Ele foi escrito para ser executado em fases, com checkpoints de segurança entre cada uma. **A regra de ouro está no topo — não pule ela.**

---

## 🔒 REGRA DE OURO (ler antes de qualquer coisa)

Você (Antigravity) está proibido de:
- Remover, renomear ou alterar qualquer arquivo, componente, rota, função ou export **sem antes confirmar que ele não é usado em nenhum lugar do projeto** (imports diretos, imports dinâmicos, strings usadas em rotas, referências em configs, uso via CMS/env, etc).
- Fazer mudanças "em massa" sem eu revisar. Trabalhe em **lotes pequenos** (1 tipo de mudança por vez) e gere um resumo do que foi alterado antes de seguir para o próximo lote.
- Alterar comportamento visual, UX, textos, lógica de negócio ou contratos de API. O objetivo é **performance e peso do projeto**, não refatoração de produto.
- Apagar algo definitivamente na primeira passada. Sempre que for remover um arquivo/dependência, primeiro **comente/isole** ou mova para uma pasta `_archive_removidos/` (fora do build) e só apague de vez depois que eu confirmar que testei.

Antes de iniciar, crie uma branch nova (`git checkout -b otimizacao-performance`) e faça commits pequenos e descritivos a cada etapa concluída, para que qualquer coisa possa ser revertida individualmente.

---

## FASE 1 — Auditoria (só analisar, não alterar nada ainda)

Gere um relatório (`RELATORIO_AUDITORIA.md`) respondendo com dados reais do projeto:

### 1.1 Arquivos e código não utilizados
- Rode uma ferramenta de detecção de código morto adequada ao stack (ex: `ts-prune`, `knip`, `depcheck`, `unimported` para Node/TS/Next.js).
- Liste: arquivos nunca importados, componentes exportados mas nunca usados, funções/utilitários órfãos, rotas de API sem chamada no frontend, imagens/assets na pasta `public` que não aparecem em nenhum código.
- Para cada item da lista, informe: caminho do arquivo, tamanho, e uma frase confirmando que buscou por referências (incluindo strings dinâmicas) antes de classificar como "não usado".

### 1.2 Dependências
- Rode `depcheck` (ou equivalente) para achar dependências no `package.json` que não são mais importadas em lugar nenhum.
- Identifique dependências duplicadas (ex: duas libs que fazem a mesma coisa, tipo `moment` + `dayjs`, ou múltiplas libs de ícones).
- Identifique dependências pesadas que têm alternativa mais leve (ex: `lodash` inteiro vs `lodash-es`/imports pontuais, `moment.js` vs `date-fns`).
- Rode um bundle analyzer (`@next/bundle-analyzer` se for Next.js, ou equivalente do framework) e liste as 10 dependências que mais pesam no bundle final.

### 1.3 Build e deploy (foco no motivo dos ~3 minutos)
Investigue e reporte, com números:
- Quantas Serverless/Edge Functions o projeto está gerando no Vercel (`vercel build` local ou `.vercel/output`). Muitas funções pequenas = build mais lento.
- Se o cache de build do Vercel está sendo aproveitado (procure por instalações de dependências do zero a cada deploy, ou `node_modules` sendo reconstruído sem necessidade).
- Se há geração de páginas estáticas (SSG/ISR) que poderiam substituir SSR desnecessário.
- Se existem imagens não otimizadas (fora do `next/image` ou equivalente) ou assets grandes versionados no repo.
- Se há processos de build customizados (webpack config, scripts de pré-build) fazendo trabalho redundante.
- Tempo de `type-check` e `lint` durante o build — se estão rodando em paralelo ou travando o build sequencialmente.

Entregue o relatório com uma tabela final: **Problema → Impacto estimado (peso/tempo) → Risco de mexer (baixo/médio/alto)**.

---

## FASE 2 — Aplicar (só depois que eu aprovar o relatório da Fase 1)

Execute em lotes, um de cada vez, testando o build local (`npm run build`) entre cada lote:

**Lote 1 — Dependências**
- Remover dependências confirmadas como não usadas.
- Substituir imports "pesados" por imports pontuais (ex: `import { debounce } from 'lodash'` em vez de `import _ from 'lodash'`).
- Consolidar libs duplicadas, mantendo a que já é mais usada no projeto.

**Lote 2 — Arquivos/código morto**
- Mover para `_archive_removidos/` os arquivos confirmados sem nenhuma referência.
- Rodar o projeto e a suíte de testes (se houver) para confirmar que nada quebrou.
- Só então apagar definitivamente.

**Lote 3 — Build/Deploy (Vercel)**
- Ativar/otimizar cache de build (garantir que `node_modules` e cache do framework não sejam invalidados à toa).
- Revisar rotas de API: unificar funções serverless pequenas quando fizer sentido, sem mudar os endpoints públicos.
- Converter páginas que não precisam de dados em tempo real de SSR para SSG/ISR.
- Garantir que todas as imagens passem por otimização automática (`next/image` ou equivalente) em vez de `<img>` cru.
- Remover `console.log`/código de debug deixado em produção.
- Verificar `tsconfig`/`next.config` para excluir pastas desnecessárias do build (ex: `.stories.tsx`, mocks, arquivos de teste) do bundle de produção.

**Lote 4 — Code splitting e carregamento**
- Aplicar `dynamic import` / lazy loading em componentes pesados que não aparecem imediatamente na tela (modais, gráficos, editores ricos, etc).
- Verificar se bibliotecas grandes (gráficos, PDF, editores) só carregam nas páginas onde são realmente usadas.

---

## FASE 3 — Validação final

Depois de cada lote aplicado, gere um novo `RELATORIO_RESULTADO.md` comparando **antes x depois**:
- Tempo de build local
- Tempo de deploy no Vercel
- Tamanho total do bundle (First Load JS)
- Número de Serverless/Edge Functions
- Confirmação, página por página, de que todas as funcionalidades continuam iguais (uma checklist manual das principais telas/fluxos do SaaS para eu testar antes de mergear na `main`)

---

## Prompt resumido (caso queira colar uma versão curta primeiro)

```
Você é um dev senior especialista em performance e build. NÃO altere comportamento, layout ou lógica de negócio — apenas peso e velocidade de build/deploy. Trabalhe em uma branch separada, em lotes pequenos, com commits descritivos. Primeiro faça só uma AUDITORIA (sem alterar nada): arquivos/componentes/rotas não usados, dependências não usadas ou duplicadas, causas do build lento no Vercel (nº de funções serverless, cache, imagens não otimizadas, SSR desnecessário). Gere um relatório com risco de cada mudança antes de aplicar qualquer coisa. Só aplique após minha aprovação, um lote por vez, testando o build entre cada um.
```

---

### Observação
Este documento foi pensado para ser usado com o Antigravity (ou qualquer agente de codificação), mas a lógica de auditoria → aprovação → aplicação em lotes → validação serve para proteger seu SaaS de quebras, já que "não usado pelo grep" às vezes ainda é usado de forma dinâmica (ex: string montada em runtime, rota carregada por CMS, etc).