/**
 * Dates that sell for a repair shop, each with ready-made texts. The texts are
 * written once for every store, with {loja}, {cidade}, {whatsapp} and
 * {instagram} filled in from the brand kit: no AI and no cost per store.
 */

export interface SeasonalEvent {
    id: string
    month: number // 1-12
    day: number
    title: string
    /** Big line on the art. */
    headline: string
    /** Small line on the art. */
    subline: string
    why: string
    texts: { instagram: string; whatsapp: string; google: string }
}

export const SEASONAL_EVENTS: SeasonalEvent[] = [
    {
        id: 'jan-verao', month: 1, day: 15,
        title: 'Verão: celular na água',
        headline: 'Celular caiu na água?',
        subline: 'Nada de arroz. Traga hoje para a limpeza técnica.',
        why: 'O calor aumenta os acidentes com piscina, mar e superaquecimento.',
        texts: {
            instagram: 'Celular caiu na piscina ou no mar? 🌊\n\nO arroz não resolve e ainda deixa resíduo dentro do aparelho. O que salva é agir rápido:\n\n1. Desligue na hora\n2. Não coloque para carregar\n3. Traga para a limpeza técnica\n\nAqui na {loja} fazemos a desoxidação da placa com banho ultrassônico e diagnóstico na hora.\n\n📍 {cidade}\n💬 WhatsApp: {whatsapp}\n\n#celularmolhado #assistenciatecnica #{hashcidade}',
            whatsapp: 'Oi! Aqui é da {loja} 👋\n\nSe o seu celular cair na água neste verão: desligue na hora, não carregue e traga para a gente. Quanto antes a limpeza, maior a chance de salvar a placa e os seus dados.\n\nQualquer dúvida é só responder aqui!',
            google: 'Celular molhado? Desligue, não carregue e traga para a {loja} em {cidade}. Fazemos limpeza técnica com banho ultrassônico e diagnóstico na hora. WhatsApp: {whatsapp}.',
        },
    },
    {
        id: 'fev-aulas', month: 2, day: 5,
        title: 'Volta às aulas',
        headline: 'Notebook pronto para as aulas',
        subline: 'Upgrade de SSD, limpeza e formatação.',
        why: 'Estudantes precisam de computador rápido no começo do semestre.',
        texts: {
            instagram: 'Notebook lento no começo das aulas? 🎒\n\nCom um SSD e uma limpeza interna, aquele notebook antigo liga em segundos e para de esquentar.\n\nNa {loja} fazemos:\n✅ Troca para SSD com cópia dos arquivos\n✅ Limpeza e pasta térmica nova\n✅ Formatação com os programas essenciais\n\n📍 {cidade} · 💬 {whatsapp}\n\n#voltaasaulas #notebook #ssd #{hashcidade}',
            whatsapp: 'Oi! A {loja} está com revisão de notebook para a volta às aulas: SSD, limpeza e formatação, com seus arquivos preservados. Quer um orçamento? É só responder 😊',
            google: 'Volta às aulas: deixe o notebook rápido de novo. Troca para SSD, limpeza interna e formatação na {loja}, em {cidade}. Orçamento pelo WhatsApp {whatsapp}.',
        },
    },
    {
        id: 'mar-consumidor', month: 3, day: 15,
        title: 'Dia do Consumidor',
        headline: 'Garantia de verdade',
        subline: 'Peça com procedência e prazo por escrito.',
        why: 'Boa data para reforçar transparência e garantia.',
        texts: {
            instagram: 'No Dia do Consumidor, a gente fala do que importa: confiança. 🤝\n\nNa {loja} todo conserto tem:\n✅ Orçamento antes de mexer\n✅ Peça com procedência\n✅ Garantia por escrito\n✅ Acompanhamento do serviço pelo celular\n\n📍 {cidade} · 💬 {whatsapp}\n\n#diadoconsumidor #assistenciatecnica #{hashcidade}',
            whatsapp: 'Oi! Hoje é Dia do Consumidor e a {loja} agradece a confiança 🙏 Precisando de conserto, é orçamento antes, peça com procedência e garantia por escrito. Conte com a gente!',
            google: 'Na {loja}, em {cidade}, todo conserto tem orçamento antes, peça com procedência e garantia por escrito. Fale conosco: {whatsapp}.',
        },
    },
    {
        id: 'abr-terra', month: 4, day: 22,
        title: 'Dia da Terra: descarte de lixo eletrônico',
        headline: 'Descarte certo, desconto na troca',
        subline: 'Traga a bateria velha na troca da nova.',
        why: 'Campanha de recolhimento de baterias e aparelhos sem uso.',
        texts: {
            instagram: 'Bateria velha não vai para o lixo comum. 🌱\n\nNo Dia da Terra, a {loja} recebe baterias, cabos e aparelhos sem uso e encaminha para o descarte correto.\n\nE quem trocar a bateria esta semana ganha condição especial.\n\n📍 {cidade} · 💬 {whatsapp}\n\n#diadaterra #lixoeletronico #sustentabilidade #{hashcidade}',
            whatsapp: 'Oi! Tem bateria, cabo ou celular velho parado em casa? Traga na {loja}: a gente encaminha para o descarte correto. E quem trocar a bateria esta semana tem condição especial 🌱',
            google: 'Dia da Terra: a {loja} recebe baterias e aparelhos sem uso para descarte correto. Troca de bateria com condição especial esta semana. {cidade} · {whatsapp}.',
        },
    },
    {
        id: 'mai-maes', month: 5, day: 10,
        title: 'Dia das Mães',
        headline: 'O celular da mãe novinho',
        subline: 'Tela, bateria e película no mesmo dia.',
        why: 'Troca de tela ou bateria como presente prático.',
        texts: {
            instagram: 'Presente útil de Dia das Mães: o celular dela funcionando como novo. 💐\n\nTela trincada, bateria que não dura, câmera embaçada: a {loja} resolve, com garantia.\n\n📍 {cidade} · 💬 {whatsapp}\n\n#diadasmaes #presente #consertodecelular #{hashcidade}',
            whatsapp: 'Oi! Que tal dar para a sua mãe o celular dela como novo? 💐 Troca de tela, bateria e película com garantia na {loja}. Me chama para ver o valor!',
            google: 'Dia das Mães: troca de tela, bateria e película com garantia na {loja}, em {cidade}. Orçamento pelo WhatsApp {whatsapp}.',
        },
    },
    {
        id: 'jun-namorados', month: 6, day: 12,
        title: 'Dia dos Namorados',
        headline: 'Fotos lindas, tela perfeita',
        subline: 'Câmera e tela prontas antes do encontro.',
        why: 'Ninguém quer foto do jantar com a câmera borrada.',
        texts: {
            instagram: 'Dia dos Namorados chegando e a câmera está borrada? 📸❤️\n\nTroca de lente, tela e bateria na {loja}, com garantia, a tempo do encontro.\n\n📍 {cidade} · 💬 {whatsapp}\n\n#diadosnamorados #camera #celular #{hashcidade}',
            whatsapp: 'Oi! Câmera borrada ou tela trincada? Deixe o celular pronto para o Dia dos Namorados na {loja} ❤️ Me chama que eu passo o valor.',
            google: 'Dia dos Namorados: troca de lente de câmera, tela e bateria com garantia na {loja}, em {cidade}. WhatsApp: {whatsapp}.',
        },
    },
    {
        id: 'jul-gamer', month: 7, day: 20,
        title: 'Férias: manutenção gamer',
        headline: 'PC e videogame sem travar',
        subline: 'Limpeza e pasta térmica nova.',
        why: 'Nas férias o PC e o console trabalham mais e esquentam.',
        texts: {
            instagram: 'PC ou videogame esquentando e travando no meio do jogo? 🎮\n\nPoeira e pasta térmica ressecada derrubam o desempenho. A limpeza completa com pasta nova resolve.\n\nNa {loja}: PC, notebook gamer e consoles.\n\n📍 {cidade} · 💬 {whatsapp}\n\n#pcgamer #manutencao #ferias #{hashcidade}',
            whatsapp: 'Oi! Férias chegando e o PC ou videogame esquentando? A {loja} faz limpeza completa com pasta térmica nova. Me chama para agendar 🎮',
            google: 'Manutenção de PC gamer, notebook e videogame: limpeza completa e pasta térmica nova na {loja}, em {cidade}. WhatsApp: {whatsapp}.',
        },
    },
    {
        id: 'ago-pais', month: 8, day: 11,
        title: 'Dia dos Pais',
        headline: 'O celular do pai como novo',
        subline: 'Tela e bateria com garantia.',
        why: 'Pais costumam usar o aparelho trincado até não dar mais.',
        texts: {
            instagram: 'Aquele celular do pai com a tela toda trincada? 👔\n\nNo Dia dos Pais, dê o conserto: tela, bateria e revisão geral na {loja}, com garantia.\n\n📍 {cidade} · 💬 {whatsapp}\n\n#diadospais #presente #consertodecelular #{hashcidade}',
            whatsapp: 'Oi! Presente de Dia dos Pais: o celular dele funcionando como novo. Tela, bateria e revisão com garantia na {loja}. Quer saber o valor?',
            google: 'Dia dos Pais: troca de tela e bateria com garantia na {loja}, em {cidade}. Orçamento pelo WhatsApp {whatsapp}.',
        },
    },
    {
        id: 'ago-informatica', month: 8, day: 15,
        title: 'Dia da Informática',
        headline: 'Bastidores da bancada',
        subline: 'Conserto de placa no microscópio.',
        why: 'Data para mostrar o laboratório e a precisão técnica.',
        texts: {
            instagram: 'Dia da Informática: mostrando os bastidores da nossa bancada. 🔬\n\nMuito conserto que parece impossível é resolvido trocando um componente do tamanho de um grão de areia, no microscópio.\n\nÉ assim que a {loja} salva aparelhos (e dados) que outros dão como perdidos.\n\n📍 {cidade} · 💬 {whatsapp}\n\n#diadainformatica #reparodeplaca #microsolda #{hashcidade}',
            whatsapp: 'Oi! Hoje é Dia da Informática 💻 Aparelho que "não tem conserto"? Traga para uma segunda opinião na {loja}: fazemos reparo de placa no microscópio.',
            google: 'Reparo de placa em nível de componente, no microscópio, na {loja} em {cidade}. Segunda opinião para aparelhos "sem conserto". WhatsApp: {whatsapp}.',
        },
    },
    {
        id: 'set-cliente', month: 9, day: 15,
        title: 'Dia do Cliente',
        headline: 'Diagnóstico grátis',
        subline: 'Só no Dia do Cliente.',
        why: 'Ação de fidelização com um brinde simples.',
        texts: {
            instagram: 'Dia do Cliente é dia de agradecer. 🎁\n\nHoje o diagnóstico na {loja} é por nossa conta. Traga o aparelho que está dando problema e saia sabendo o que ele tem.\n\n📍 {cidade} · 💬 {whatsapp}\n\n#diadocliente #assistenciatecnica #{hashcidade}',
            whatsapp: 'Oi! Hoje é Dia do Cliente e o diagnóstico na {loja} é por nossa conta 🎁 Tem algum aparelho dando problema? Traga que a gente olha.',
            google: 'Dia do Cliente: diagnóstico grátis na {loja}, em {cidade}. Traga seu celular, tablet ou notebook. WhatsApp: {whatsapp}.',
        },
    },
    {
        id: 'out-rosa', month: 10, day: 18,
        title: 'Outubro Rosa: prevenção',
        headline: 'Prevenir é o melhor cuidado',
        subline: 'Revisão preventiva do seu aparelho.',
        why: 'Conscientização e a ideia de prevenção também para o aparelho.',
        texts: {
            instagram: 'Outubro Rosa lembra que prevenir é o melhor cuidado. 🎗️\n\nFaça seus exames. E, no dia a dia, uma revisão preventiva evita que o celular pare na hora que você mais precisa.\n\n{loja} · {cidade} · 💬 {whatsapp}\n\n#outubrorosa #prevencao #{hashcidade}',
            whatsapp: 'Oi! No Outubro Rosa a {loja} reforça: prevenir é o melhor cuidado 🎗️ Faça seus exames e, se precisar, conte com a gente para a revisão do seu aparelho.',
            google: 'Outubro Rosa: prevenir é o melhor cuidado. Revisão preventiva de celulares e computadores na {loja}, em {cidade}. WhatsApp: {whatsapp}.',
        },
    },
    {
        id: 'nov-black', month: 11, day: 27,
        title: 'Black Friday',
        headline: 'Black Friday da assistência',
        subline: 'Tela + bateria com desconto.',
        why: 'A semana de maior movimento do ano.',
        texts: {
            instagram: 'Black Friday na {loja}! 🖤\n\nCombo tela + bateria com desconto, películas e acessórios com preço especial. Só esta semana.\n\n📍 {cidade} · 💬 {whatsapp}\n\n#blackfriday #consertodecelular #acessorios #{hashcidade}',
            whatsapp: 'Oi! É Black Friday na {loja} 🖤 Combo tela + bateria com desconto e acessórios com preço especial, só esta semana. Quer que eu reserve um horário?',
            google: 'Black Friday na {loja}, em {cidade}: combo tela + bateria com desconto e acessórios com preço especial. WhatsApp: {whatsapp}.',
        },
    },
    {
        id: 'dez-viagem', month: 12, day: 20,
        title: 'Fim de ano e viagens',
        headline: 'Bateria nova para viajar',
        subline: 'Não fique sem celular nas férias.',
        why: 'Antes de viajar todo mundo quer bateria boa e espaço livre.',
        texts: {
            instagram: 'Vai viajar no fim de ano? ✈️\n\nBateria que não aguenta o dia é a última coisa que você quer na estrada. Troque antes de ir, com garantia, na {loja}.\n\n📍 {cidade} · 💬 {whatsapp}\n\n#fimdeano #viagem #bateria #{hashcidade}',
            whatsapp: 'Oi! Antes de viajar, que tal trocar a bateria do celular? A {loja} faz na hora, com garantia ✈️ Me chama para ver o valor.',
            google: 'Troca de bateria na hora e com garantia para viajar tranquilo. {loja}, em {cidade}. WhatsApp: {whatsapp}.',
        },
    },
]

/** Next dates from today, in calendar order (wraps into next year). */
export function upcomingEvents(from = new Date(), count = SEASONAL_EVENTS.length) {
    const y = from.getFullYear()
    const today = new Date(y, from.getMonth(), from.getDate()).getTime()
    return SEASONAL_EVENTS
        .map(e => {
            let when = new Date(y, e.month - 1, e.day)
            if (when.getTime() < today) when = new Date(y + 1, e.month - 1, e.day)
            return { event: e, date: when, days: Math.round((when.getTime() - today) / 86_400_000) }
        })
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(0, count)
}

export const eventById = (id: string | null | undefined) => SEASONAL_EVENTS.find(e => e.id === id) ?? null
