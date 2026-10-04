# Nexus OS — motions por módulo

Um vídeo narrado (~14–18s) para cada módulo do app, em 9:16 (Reels/TikTok/Shorts)
e 16:9 (YouTube): 9 módulos × 2 formatos = 18 vídeos. Mesma identidade, voz e
CTA do promo aprovado em `../nexus-os-promo`.

Estrutura de cada vídeo (4 cenas):

1. **Gancho** — a dor do lojista, palavra a palavra no ritmo da fala.
2. **Demonstração A** e 3. **Demonstração B** — a tela do módulo em ação, com as
   animações disparadas pelas palavras-chave da locução.
4. **CTA** — logo, nome do módulo, "Teste grátis por 15 dias", nexusgestor.com
   (mesma fala aprovada do promo).

Legendas sincronizadas nas cenas 2–4 (na 1, o texto na tela já é a fala).

## Roteiros

Fonte única: `modules.json` (copy tirada da landing e do FAQ).

| Módulo | Gancho | Demonstração A | Demonstração B |
| --- | --- | --- | --- |
| Ordens de serviço | Aparelho parado na bancada, e ninguém sabe em que pé está? | No Nexus OS, cada ordem de serviço entra com fotos, checklist e orçamento. | Etapa, técnico e prazo na tela. E o cliente acompanha pelo link, sem ligar para a loja. |
| PDV e caixa | Caixa que não bate no fim do dia? | No PDV do Nexus OS, a venda no balcão sai em segundos. | Vendas, sangrias e contas fixas caem no caixa, cada uma no dia certo. |
| Estoque e aparelhos | Não sabe o que ainda tem na prateleira? | No Nexus OS, peças, acessórios e seminovos ficam com custo e preço, num lugar só. | Pegou um aparelho na troca? A avaliação fica registrada no estoque. |
| Tarefas e lembretes | Aquele retorno para o cliente ficou só na cabeça? | No Nexus OS, as pendências da loja ficam num lugar só. | E o lembrete chega no seu celular, na hora certa. |
| Relatórios | Chega o fim do mês e você não sabe se teve lucro? | No Nexus OS, faturamento, lucro e ticket médio aparecem na tela, comparados com o mês anterior. | E no plano Pro, ainda tem DRE, meta do mês e desempenho por técnico. |
| Pós-venda | Atendeu o cliente e nunca mais falou com ele? | O Nexus OS reúne as avaliações dos seus clientes. | E no plano Pro, mostra quem contatar, com a mensagem pronta no WhatsApp. |
| Catálogo online | Ainda manda foto de aparelho, um por um, no WhatsApp? | Com o catálogo online do Nexus OS, seus aparelhos e acessórios viram uma vitrine. | Com link próprio, pronto para divulgar. |
| Studio de conteúdo | Sem ideia do que postar hoje? | O Studio do Nexus OS cria ideias, roteiros e artes a partir dos seus serviços. | Conteúdo da sua loja para as redes, sem começar do zero. |
| Alice (IA) | E se você pudesse perguntar, e o sistema respondesse? | A Alice é a inteligência artificial do Nexus OS: responde sobre a loja, por texto ou voz, e prepara ações que você confirma. | E no WhatsApp da loja, ela informa o status do aparelho para o cliente. |

CTA (todos): "Teste grátis por quinze dias, sem cartão. nexusgestor ponto com."

## Voz

Gemini TTS, voz **Puck**, `gemini-3.8-flash-lite-tts`, estilo "locutor brasileiro,
português do Brasil (sotaque paulista neutro), tom confiante e próximo, ritmo de
Reels". As 27 falas foram geradas em 3 chamadas (9 frases cada, pausa de ~0,5s
entre elas) e cortadas por `scripts/split-batches.py`, que escolhe os cortes
cujos trechos melhor batem com a contagem de sílabas, apara as bordas e
normaliza a -16 LUFS. Cada fala foi conferida por transcrição (Gemini): todas
pt-BR e com o texto certo. O CTA reaproveita `../nexus-os-promo/assets/voice/09.wav`.

## Gerar de novo

```bash
python3 scripts/build.py                      # tempos das palavras, storyboards e cenas (18 vídeos)
./scripts/assemble.sh pdv-e-caixa 9x16        # monta um vídeo em index.html (lint/check/snapshot rodam nele)
./scripts/render-all.sh                       # monta, checa e renderiza os 18 → renders/<slug>-<fmt>.mp4
```

Os layouts e animações de cada módulo ficam em `scripts/build.py` (`surfaces()`;
gancho em `hook()`, CTA em `cta()`). As telas são desenhadas na escala do 16:9 e,
no 9:16, exibidas com `zoom: 1.35`.
