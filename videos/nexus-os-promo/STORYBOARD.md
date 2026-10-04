---
format: 1080x1920
duration: 30s
message: "Tudo da sua assistência técnica em um só app"
arc: Hook → Produto → Tour (OS · PDV/Caixa · Estoque · Relatórios · Alice) → Tudo em um app → CTA
audience: donos de assistência técnica de celulares e eletrônicos
mode: collaborative
captions: yes
voice: Puck (Gemini TTS, pt-BR)
music: none
---

## Frame 1 — Hook

- scene: "Caderno." "WhatsApp." "Memória." batem um a um e são riscados; resolve em "Sua assistência merece mais."
- voiceover: "Caderno. WhatsApp. Memória. Sua assistência merece mais."
- duration: 5.15s
- transition_in: cut
- status: animated
- src: compositions/frames/01-hook.html
- type: hook
- persuasion: Negative contrast
- beat: frustration → curiosity
- blueprint: kinetic-type-beats
- asset_candidates:

narrativeRole: nomeia em 3 palavras como a loja se organiza hoje (a própria copy da landing: "o que hoje fica no caderno, no WhatsApp e na memória") e risca tudo.
keyMessage: o jeito atual não dá conta.

blueprint: kinetic-type-beats (Reproduce)
Scene 1 (0.0–1.1s): "Caderno." slams in left-aligned upper third (spring-pop), muted gray; an indigo strike line draws across it as the VO finishes the word.
Scene 2 (1.1–2.2s): "WhatsApp." slams in below, same strike on its cue.
Scene 3 (2.2–3.3s): "Memória." slams in below, struck.
Scene 4 (3.3–5.1s): struck words dim to 35%; "Sua assistência merece mais." rises in below in ink at h1 size, "mais." in indigo with a spring-pop on its cue; hold the read.

## Frame 2 — Nexus OS

- scene: logo hexagonal do Nexus surge com brilho violeta→ciano, wordmark "Nexus OS" + eyebrow "Sistema para assistências técnicas"
- voiceover: "Conheça o Nexus OS."
- duration: 1.84s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/02-intro.html
- type: product_intro
- persuasion: Authority by association
- beat: clarity
- blueprint: logo-assemble-lockup
- asset_candidates: assets/nexus-logo.png — logo hexagonal violeta→ciano com wordmark NEXUS

narrativeRole: apresenta a marca como resposta.
keyMessage: Nexus OS é o sistema da assistência técnica.

blueprint: logo-assemble-lockup (Adapt — bloom, not parts)
Scene 1 (0.0–0.6s): violet→cyan glow blooms dead-center; the white app-icon tile with the Nexus mark spring-pops from 0.6 scale. Centered, upper-middle.
Scene 2 (0.6–1.58s): "Nexus OS" rises under it as the VO says the name; eyebrow follows; hold.

## Frame 3 — Ordens de serviço

- scene: card de OS "#1042 · iPhone 13 · Troca de tela · Ana P." num app iOS; o pill de status avança Na fila → Em reparo → Pronto para retirada; chip "Link de acompanhamento enviado ao cliente"
- voiceover: "Cada ordem de serviço com etapa e prazo, e o cliente acompanha pelo link."
- duration: 4.13s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/03-os.html
- type: feature_showcase
- persuasion: Show-don't-tell proof
- beat: control
- blueprint: device-surface-showcase
- asset_candidates: [HTML mockup] os-tracking — etapas do rastreio da OS; [HTML mockup] dashboard-painel — lista de OS com pills de status

narrativeRole: primeira parada do tour — o coração do sistema, a OS que anda sozinha e avisa o cliente.
keyMessage: cada aparelho com etapa, técnico e prazo; o cliente acompanha pelo link.

blueprint: device-surface-showcase (Adapt — stepwise flow on one held app card)
Scene 1 (0.0–1.3s): eyebrow + headline rise top-left; the white OS card rises from below into the upper-middle (hero, ~85% width).
Scene 2 (1.3–2.8s): on "etapa e prazo" the status rail lights step by step: Na fila → Em reparo (indigo dot travels down), pill on the card swaps label in place.
Scene 3 (2.8–4.37s): on "cliente acompanha pelo link" the marker lands on "Pronto para retirada" (turns green, check), and the "Link de acompanhamento enviado" chip spring-pops below the card; hold.

## Frame 4 — PDV e caixa

- scene: título "PDV e caixa"; três vendas entram numa lista (Película 3D, Carregador USB-C, Capinha) enquanto "Caixa de hoje" conta até R$ 1.286,00 · 9 vendas no PDV
- voiceover: "PDV e caixa que fecham certinho no fim do dia."
- duration: 2.83s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/04-pdv.html
- type: feature_showcase
- persuasion: Feature-to-benefit translation
- beat: ease
- blueprint: dataviz-countup
- asset_candidates: [HTML mockup] pdv-caixa — venda rápida e caixa do dia

narrativeRole: o balcão — venda rápida e caixa que fecha.
keyMessage: caixa que bate no fim do dia.

blueprint: dataviz-countup (Adapt — one hero number + feeding list)
Scene 1 (0.0–0.4s): eyebrow + headline; the "Caixa de hoje" card rises.
Scene 2 (0.4–2.2s): sale rows drop into the list one by one while the hero number counts up R$ 0 → R$ 1.286,00.
Scene 3 (2.2–2.9s): "9 vendas no PDV" green chip pops on "fim do dia"; hold.

## Frame 5 — Estoque

- scene: título "Estoque e aparelhos"; linhas de peças/seminovos montam em cascata com quantidade e preço (Tela iPhone 13, Bateria Galaxy A54, Conector Moto G84, iPhone 11 seminovo)
- voiceover: "Estoque de peças e seminovos sob controle."
- duration: 2.77s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/05-estoque.html
- type: feature_showcase
- persuasion: Rule of three
- beat: control
- blueprint: grid-card-assemble
- asset_candidates: [HTML mockup] module-grid — tiles índigo com ícones

narrativeRole: o que tem na prateleira, com custo e preço.
keyMessage: peças, acessórios e seminovos sob controle.

blueprint: grid-card-assemble (Reproduce — vertical list)
Scene 1 (0.0–0.4s): eyebrow + headline.
Scene 2 (0.4–1.6s): four inventory rows self-assemble in a staggered cascade, each quantity chip popping as its row lands; the seminovo row lands on "seminovos".
Scene 3 (1.6–2.6s): hold.

## Frame 6 — Relatórios

- scene: "Faturamento do mês" conta até R$ 18.450,90 com chip verde "+12% vs anterior"; barras do mês crescem; "Lucro líquido R$ 7.320,40 · margem 39,7%" aparece embaixo
- voiceover: "E no fim do mês, você sabe se teve lucro."
- duration: 2.69s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/06-relatorios.html
- type: feature_showcase
- persuasion: Statistical proof
- beat: confidence
- blueprint: dataviz-countup
- asset_candidates: [HTML mockup] dashboard-painel — KPIs de faturamento e lucro

narrativeRole: o fim do mês sem susto — lucro na tela.
keyMessage: você sabe se teve lucro.

blueprint: dataviz-countup (Reproduce)
Scene 1 (0.0–1.3s): card rises; bars grow left→right while "Faturamento do mês" counts up to R$ 18.450,90; last bar indigo.
Scene 2 (1.3–2.33s): "+12% vs anterior" chip pops, then the lucro card slides up on "lucro"; hold.

## Frame 7 — Alice

- scene: fundo preto; eyebrow "Alice · IA"; pergunta digita em bolha índigo "Quais aparelhos estão prontos e ninguém veio buscar?"; Alice responde "São 4, prontos há mais de 3 dias" + lista; "Pode criar" → check verde "Tarefa criada para hoje às 14h"
- voiceover: "Pergunte para a Alice, a inteligência artificial do Nexus: ela responde e resolve."
- duration: 5.13s
- transition_in: blur-crossfade
- status: animated
- src: compositions/frames/07-alice.html
- type: feature_showcase
- persuasion: Show-don't-tell proof
- beat: awe → ease
- blueprint: prompt-type-submit-generate
- asset_candidates: [HTML mockup] alice-chat — chat escuro com a Alice

narrativeRole: o diferencial — perguntar e a IA resolver.
keyMessage: pergunte, a Alice responde e resolve.

blueprint: prompt-type-submit-generate (Adapt — chat thread)
Scene 1 (0.0–1.0s): black ground; eyebrow + headline; chat panel rises; the question types into the indigo user bubble.
Scene 2 (1.0–2.6s): three thinking dots, then Alice's answer bubble streams in line by line (on "Alice").
Scene 3 (2.6–3.6s): "Pode criar" bubble pops (user).
Scene 4 (3.6–4.78s): on "resolve" the confirmation bubble with green check spring-pops; hold.

## Frame 8 — Tudo em um app

- scene: "Tudo da loja em um app" no topo; 8 tiles de módulos (OS, PDV e caixa, Estoque, Tarefas, Relatórios, Pós-venda, Catálogo, Studio) montam em cascata numa grade 2×4
- voiceover: "Tudo da sua loja, em um só app."
- duration: 2.02s
- transition_in: blur-crossfade
- status: animated
- src: compositions/frames/08-tudo.html
- type: benefit_highlight
- persuasion: Value stacking
- beat: power
- blueprint: grid-card-assemble
- asset_candidates: [HTML mockup] module-grid — grade de ícones dos módulos

narrativeRole: fecha o tour mostrando a amplitude.
keyMessage: da entrada do aparelho ao fechamento do caixa.

blueprint: grid-card-assemble (Reproduce)
Scene 1 (0.0–1.3s): eyebrow + headline; 8 module tiles cascade into a 2×4 grid; the Alice tile (solid indigo icon) lands last with a pop.
Scene 2 (1.3–1.96s): hold.

## Frame 9 — CTA

- scene: logo Nexus OS centralizado; "Sua assistência organizada a partir de hoje."; botão índigo "Teste grátis por 15 dias"; "Sem cartão de crédito" + "nexusgestor.com"
- voiceover: "Teste grátis por quinze dias, sem cartão. nexusgestor ponto com."
- duration: 4.37s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/09-cta.html
- type: cta
- persuasion: Risk reversal
- beat: motivation
- blueprint: titlecard-reveal
- asset_candidates: assets/nexus-logo.png — logo hexagonal violeta→ciano com wordmark NEXUS

narrativeRole: pedido de ação com risco zero.
keyMessage: teste grátis 15 dias, sem cartão — nexusgestor.com.

blueprint: titlecard-reveal (Adapt — stacked end card)
Scene 1 (0.0–0.6s): glow + logo tile pop; headline rises.
Scene 2 (0.6–2.4s): indigo CTA pill springs in on "Teste grátis"; "Sem cartão de crédito." fades up on "sem cartão".
Scene 3 (2.4–3.86s): "nexusgestor.com" rises on the URL; button gives one press-release spring; final held frame.

## Video direction

- Fio condutor: o card branco do app (iOS) que muda de conteúdo a cada parada do tour; o tour anda para a esquerda (push-slide ←).
- Ritmo: rápido de Reels; cada revelação cai na palavra da locução. Frames segurados: fim da cena 2 (logo) e a cena 9 (CTA, frame final parado).
- Movimento: entradas fromTo com power3.out (subidas de 40–80px + fade), spring-pop (back.out) só em itens de destaque (palavras do gancho, logo, chips, botão). Nada de loops/yoyo.
- Legendas: pill na faixa inferior (17%); todo o conteúdo acima de y ≈ 1590px. A cena 1 não leva legenda (o texto na tela já é a fala).
- Proibido: texto em gradiente; telas fora do estilo do app; card estático sem revelação; brilho/bokeh decorativo fora do logo (cenas 2 e 9).
