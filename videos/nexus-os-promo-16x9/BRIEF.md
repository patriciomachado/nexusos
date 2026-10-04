---
workflow: product-launch-video
flow: automation
storyboard: yes
message: "Tudo da sua assistência técnica em um só app"
destination: youtube
aspect: 1920x1080
language: pt-BR
audience: donos de assistência técnica de celulares e eletrônicos
length: 30s
angle: tour de recursos
---

## Intent

Motion de apresentação do Nexus OS (nexusgestor.com), sistema de gestão para
assistências técnicas. Tour de recursos em ritmo de rede social: OS com
rastreio do cliente, PDV e caixa, estoque, relatórios e a Alice (IA que
responde e age no sistema e atende no WhatsApp). Sem narração — tipografia
animada + trilha de fundo, legível com som desligado.

## Customizations

- Locução pt-BR (voz Puck, Gemini TTS) + legendas sincronizadas; sem trilha embutida.
- CTA final: teste grátis por 15 dias, sem cartão de crédito — nexusgestor.com.

## Notes

- Usar a copy real da landing (components/landing/Landing.tsx); dados de exemplo
  da landing (iPhone 13 · Troca de tela, Galaxy A54 · Bateria, etc.).
- Marca: índigo/violeta (primary hsl(241 61% 59%)), logo em public/logo.png.

- Sem trilha embutida: o áudio será escolhido no app (Reels/TikTok) ao postar — `music: none`.

## Variante YouTube (16:9)

- Versão horizontal 1920×1080 do vídeo aprovado em `../nexus-os-promo` (9:16).
  Mesma locução (Gemini Puck), tempos de palavra, legendas e animações; só o
  layout muda: texto à esquerda e superfície do app à direita, legendas na
  faixa inferior (y ≥ 900). Layouts em `scripts/build-frames.py`.
