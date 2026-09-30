# Módulo Tarefas + novo design

Guia de ativação e uso. O módulo é exclusivo do administrador (papéis `admin` e `owner`).

## O que foi entregue

**Tarefas (`/tarefas`)**
- **Hoje**: prazos vencidos, tarefas por período (manhã, tarde, fim do dia), rotinas em checklist, pendências dos outros módulos e linha do tempo por hora.
- **Próximos**: os próximos 7 dias e o que vem depois.
- **Algum dia**: ideias e tarefas sem data.
- **Prioridades**: matriz de Eisenhower montada sozinha a partir de prioridade e datas.
- **Rotinas**: checklists que aparecem nos dias escolhidos, com sequência de dias cumpridos (modelos: abertura da loja, fechamento do dia, revisão semanal).
- **Concluídas**: histórico dos últimos 60 dias, com "Reabrir".
- **Planejar meu dia**: revisa o que ficou de ontem, escolhe pendências dos módulos, adianta tarefas e avisa quando o dia passa do tempo disponível.

**Pendências automáticas dos módulos** (calculadas na hora, somem quando o problema é resolvido no módulo):

| Módulo | Pendência |
|---|---|
| Ordens de Serviço | OS sem movimento há 5+ dias; OS aguardando peças há 3+ dias |
| Mesa / Fluxo | Agendamentos de hoje e amanhã |
| Produtos | Itens abaixo do estoque mínimo |
| Pagamentos | Recebimentos vencidos e que vencem em até 3 dias |
| Caixa | Caixa aberto desde um dia anterior; despesas fixas vencendo |
| Aparelhos | Aparelho em revisão há 7+ dias; troca avaliada sem resposta |
| Pós-Venda | Avaliações de 1 a 3 estrelas dos últimos 14 dias |
| Clientes | Aniversariantes de hoje e amanhã |

Cada pendência pode **virar tarefa** (com link para o módulo), ser **adiada** ou **marcada como resolvida**.

**Criação rápida em português**: digite como fala, por exemplo:
- `ligar fornecedor amanhã 14h !alta`
- `pagar aluguel todo dia 10`
- `conferir estoque toda segunda de manhã`
- `entregar orçamento prazo sexta`
- `revisar vitrine por 30min`

Atalhos: **Ctrl+K** (ou **⌘K** no Mac) ou a tecla **N** abrem a criação rápida em qualquer tela. No celular há um botão **+** flutuante.

**Lembretes**: cada tarefa pode ter vários lembretes. Eles aparecem como aviso na tela, no sininho e como notificação no celular.

## Como ativar (uma vez)

### 1. Banco de dados (obrigatório)
No Supabase, abra **SQL Editor** e rode o conteúdo de
`supabase/migrations/20260924_tasks_module.sql`.

A migration só **cria** tabelas novas (`tasks`, `task_reminders`, `task_alert_states`, `task_routines`, `task_routine_runs`, `push_subscriptions`) e funções. Nenhuma tabela existente é alterada. Pode rodar mais de uma vez sem problema.

> Rode a migration **antes** de publicar o código em produção. Se a página Tarefas abrir antes disso, ela mostra um aviso pedindo a migration (o resto do app não é afetado).

### 2. Notificações no celular (opcional, recomendado)
Na Vercel, em **Settings → Environment Variables**, adicione:

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | chave pública VAPID |
| `VAPID_PRIVATE_KEY` | chave privada VAPID (secreta) |
| `VAPID_SUBJECT` | `mailto:seu-email@dominio.com` |
| `CRON_SECRET` | uma senha longa e aleatória |

Para gerar as chaves VAPID: `npx web-push generate-vapid-keys`.
Depois de salvar, faça um novo deploy.

No celular, abra **Tarefas → Lembretes no celular** e permita as notificações.
- **Android / computador**: funciona direto no Chrome, Edge ou Firefox.
- **iPhone (iOS 16.4+)**: primeiro toque em Compartilhar → **Adicionar à Tela de Início**, abra o NexusOS pelo ícone e ative ali.

### 3. Lembretes com o app fechado (opcional)
Com o app aberto em algum aparelho, os lembretes saem sozinhos (verificação a cada minuto). Para receber também com **todos** os aparelhos fechados, algo precisa chamar a cada poucos minutos:

```
GET https://SEU-DOMINIO/api/cron/task-reminders
Authorization: Bearer <CRON_SECRET>
```

Escolha **uma** opção:

- **Supabase (grátis)**: em Database → Extensions, ative `pg_cron` e `pg_net` e rode no SQL Editor:
  ```sql
  select cron.schedule(
    'nexusos-task-reminders',
    '*/5 * * * *',
    $$ select net.http_get(
         url := 'https://SEU-DOMINIO/api/cron/task-reminders',
         headers := jsonb_build_object('Authorization', 'Bearer SEU_CRON_SECRET')
       ) $$
  );
  ```
- **cron-job.org (grátis)**: crie um job a cada 5 minutos com a URL acima e o cabeçalho `Authorization`.
- **Vercel Pro**: adicione em `vercel.json`:
  ```json
  { "crons": [{ "path": "/api/cron/task-reminders", "schedule": "*/5 * * * *" }] }
  ```
  No plano Hobby a Vercel só permite cron uma vez por dia, por isso não deixei isso configurado por padrão (o deploy falharia no Hobby).

## Novo design (Apple Human Interface Guidelines)

- **Cores do sistema Apple** (claro, escuro e alto contraste), com o índigo do sistema como cor de destaque, próximo do violeta que o NexusOS já usava.
- **Fonte do sistema** (SF Pro em aparelhos Apple, Inter nos demais), sem pesos extra-pesados, com texto mínimo de 11 px e contraste corrigido em textos cinza-claros.
- **Material translúcido só na navegação** (barra lateral, barra superior, janelas). Os cartões de conteúdo são sólidos.
- Barra lateral no estilo macOS, menu do celular no estilo Ajustes do iPhone, janelas que sobem de baixo no celular e confirmações no estilo alerta do iOS.
- Zoom com os dedos liberado, e respeito a "Reduzir movimento" e "Reduzir transparência".
- Botões e títulos sem CAIXA ALTA; rótulos de formulário com só a primeira letra maiúscula.

## Correções feitas no caminho
- O **sininho** consultava o banco direto do navegador com a chave pública. Agora passa pela API, com "Marcar todas como lidas" funcionando.
- O alerta de **estoque baixo** nunca disparava (comparava a quantidade com um texto). Corrigido.
- O alerta de **OS atrasada** nunca era criado (a checagem de duplicidade sempre dava positivo). Corrigido.
- Ícone de busca duplicado nas listas de clientes, produtos e OS.
