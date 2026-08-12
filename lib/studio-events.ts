import { SeasonalEvent } from '@/types/studio'

export const BRAZILIAN_SEASONAL_EVENTS: SeasonalEvent[] = [
    // Janeiro
    {
        id: 'jan-ferias-praia',
        month: 1,
        day: 15,
        title: 'Alerta de Verão: Celular Caindo na Praia ou Piscina',
        category: 'estacao',
        description: 'O calor aumenta os acidentes com líquidos e superaquecimento de baterias.',
        suggestedTopic: 'O que fazer de imediato quando seu celular cair na piscina ou água do mar (e por que arroz é um mito).',
        badge: '🔥 Alta Demanda'
    },
    // Fevereiro
    {
        id: 'feb-volta-aulas',
        month: 2,
        day: 5,
        title: 'Volta às Aulas: Manutenção de Notebooks e Tablets',
        category: 'comercial',
        description: 'Estudantes e professores precisam de computadores rápidos para o início do semestre.',
        suggestedTopic: 'Como dar uma vida nova ao notebook antigo antes das aulas começarem (Upgrade SSD + Limpeza).',
        badge: '🎓 Escolas e Faculdades'
    },
    // Março
    {
        id: 'mar-dia-consumidor',
        month: 3,
        day: 15,
        title: 'Dia Mundial dos Direitos do Consumidor',
        category: 'comercial',
        description: 'Excelente data para reforçar transparência, garantia de peças e honestidade da assistência.',
        suggestedTopic: 'Garantia real de peças e transparência na bancada: por que escolher nossa loja.',
        badge: '🤝 Confiança'
    },
    // Abril
    {
        id: 'apr-dia-da-terra',
        month: 4,
        day: 22,
        title: 'Dia da Terra & Descarte Correto de Lixo Eletrônico',
        category: 'nacional',
        description: 'Campanha de recolhimento de baterias velhas e aparelhos inutilizados.',
        suggestedTopic: 'Traga sua bateria antiga para descarte ecológico e ganhe 15% de desconto na nova!',
        badge: '🌱 Sustentabilidade'
    },
    // Maio
    {
        id: 'may-dia-das-maes',
        month: 5,
        day: 10,
        title: 'Dia das Mães: Revitalize o Celular da Mãe',
        category: 'comercial',
        description: 'Troca de tela trincada ou bateria fraca como presente prático de Dia das Mães.',
        suggestedTopic: 'Dê vida nova ao celular da sua mãe: troca de tela e pelicula em menos de 1 hora.',
        badge: '❤️ Campeão de Vendas'
    },
    // Junho
    {
        id: 'jun-dia-dos-namorados',
        month: 6,
        day: 12,
        title: 'Dia dos Namorados: Fotos Inesquecíveis sem Tela Quebrada',
        category: 'comercial',
        description: 'Ninguém quer tirar foto no jantar de namorados com a câmera borrada ou tela rachada.',
        suggestedTopic: 'Câmera embaçada ou vidro quebrado? Arrumamos seu celular antes do encontro de namorados.',
        badge: '📸 Fotos Perfection'
    },
    // Julho
    {
        id: 'jul-férias-gamer',
        month: 7,
        day: 20,
        title: 'Férias de Julho: Manutenção Preventiva Gamer',
        category: 'tech',
        description: 'Jovens jogando mais tempo em PCs e consoles. Poeira e pasta térmica ressecada travam tudo.',
        suggestedTopic: 'Seu PC Gamer tá esquentando ou dando tela azul no jogo? Hora da troca de pasta térmica silver!',
        badge: '🎮 Gamer & PC'
    },
    // Agosto
    {
        id: 'aug-dia-dos-pais',
        month: 8,
        day: 11,
        title: 'Dia dos Pais: Reforma do Aparelho do Pai',
        category: 'comercial',
        description: 'Pais costumam usar aparelhos antigos com tela trincada até não dar mais.',
        suggestedTopic: 'Deixe o celular do seu pai como novo no Dia dos Pais com garantia estendida.',
        badge: '👴 Promoção Pai'
    },
    {
        id: 'aug-dia-informatica',
        month: 8,
        day: 15,
        title: 'Dia da Informática',
        category: 'tech',
        description: 'Data técnica perfeita para mostrar o laboratório, microscópio e precisão técnica.',
        suggestedTopic: 'Bastidores da Bancada: Como funciona o conserto de placa em nível de microscópio.',
        badge: '🔬 Bastidores'
    },
    // Setembro
    {
        id: 'sep-dia-do-cliente',
        month: 9,
        day: 15,
        title: 'Dia do Cliente: Limpeza Interna Grátis',
        category: 'comercial',
        description: 'Ação de fidelização oferecendo diagnóstico ou aplicação de película no conserto.',
        suggestedTopic: 'No Dia do Cliente, quem ganha presente é você: Diagnóstico sem compromisso na hora.',
        badge: '🎁 Brinde Especial'
    },
    // Outubro
    {
        id: 'oct-outubro-rosa',
        month: 10,
        day: 18,
        title: 'Outubro Rosa & Proteção contra Aparelho Travado',
        category: 'nacional',
        description: 'Conscientização e ofertas especiais de prevenção física de computadores/celulares.',
        suggestedTopic: 'Prevenção salva vidas e evita gastos altos: Por que fazer manutenção preventiva no seu celular.',
        badge: '🎗️ Causa Social'
    },
    // Novembro
    {
        id: 'nov-black-friday',
        month: 11,
        day: 27,
        title: 'Black Friday de Serviços & Acessórios',
        category: 'comercial',
        description: 'Semana de maior volume de vendas do ano. Combos de peliculas, cabos e revisões.',
        suggestedTopic: 'Black Friday da Assistência: Troca de Tela + Bateria com desconto imbatível!',
        badge: '💣 Maior Faturamento'
    },
    // Dezembro
    {
        id: 'dec-natal-ano-novo',
        month: 12,
        day: 20,
        title: 'Preparações de Fim de Ano & Viagens',
        category: 'comercial',
        description: 'Clientes querem viajar com a bateria 100% saudável e espaço de armazenamento limpo.',
        suggestedTopic: 'Vai viajar no fim de ano? Troque a bateria viciada para não ficar na mão sem bateria na viagem.',
        badge: '🎄 Fim de Ano'
    }
]

export const WEEKLY_CONTENT_IDEAS = [
    {
        title: 'Mito vs Verdade: Deixar no Carregador a Noite Toda',
        type: 'Reels / TikTok',
        desc: 'Explique se os celulares modernos desligam o carregamento ao atingir 100%.'
    },
    {
        title: 'Antes e Depois: Resgate de Tela Destruída',
        type: 'Carrossel / Foto',
        desc: 'Mostre a foto do celular despedaçado que chegou e o resultado perfeito ao entregar.'
    },
    {
        title: 'Dica Prática: Como Limpar o Conector de Carga em Casa sem Danificar',
        type: 'Vídeo Curto',
        desc: 'Ensine a usar uma escovinha de dente macia ou palito com cuidado para tirar fiapo do bolso.'
    }
]
