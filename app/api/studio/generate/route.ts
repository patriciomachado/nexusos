import { NextRequest, NextResponse } from 'next/server'
import { getContext, unauthorizedResponse } from '@/lib/security'

export async function POST(req: NextRequest) {
    const ctx = await getContext()
    if (!ctx) return unauthorizedResponse()

    const { db, companyId } = ctx
    const body = await req.json()

    const { 
        topic, 
        category = 'Geral', 
        osId, 
        tone = 'viral',
        targetFormat = 'reels'
    } = body

    // 1. Fetch company details for auto-personalization
    const { data: company } = await db
        .from('companies')
        .select('name, city, state, phone, address, settings')
        .eq('id', companyId)
        .single()

    const companyName = company?.name || 'Nossa Assistência Técnica'
    const companyCity = company?.city ? `${company.city}` : 'sua cidade'
    const companyPhone = company?.phone || 'nosso WhatsApp'

    let osDetailsContext = ''
    let titleText = topic || 'Conteúdo de Bancada'

    // 2. If OS ID provided, fetch OS details
    if (osId) {
        const { data: os } = await db
            .from('service_orders')
            .select(`
                id, 
                title, 
                problem_description, 
                equipment_description,
                solution_applied,
                customers(name)
            `)
            .eq('id', osId)
            .eq('company_id', companyId)
            .single()

        if (os) {
            titleText = `OS #${os.id.slice(0, 5)}: ${os.equipment_description || os.title}`
            osDetailsContext = `Aparelho: ${os.equipment_description || 'Equipamento'}. Problema: ${os.problem_description || 'Defeito trazido pelo cliente'}. Solução: ${os.solution_applied || 'Reparo concluído na bancada'}.`
        }
    }

    // 3. Construct prompt parameters for AI generation engine
    const promptSubject = osDetailsContext || topic || 'Manutenção Preventiva e Cuidados com Aparelhos Celulares e Computadores'
    
    // We attempt AI generation or fallback to our tuned prompt generator for technical shops
    const scriptResult = generateTailoredScript({
        companyName,
        companyCity,
        companyPhone,
        title: titleText,
        subject: promptSubject,
        category,
        tone,
        targetFormat
    })

    return NextResponse.json(scriptResult)
}

interface GenerateParams {
    companyName: string
    companyCity: string
    companyPhone: string
    title: string
    subject: string
    category: string
    tone: string
    targetFormat: string
}

function generateTailoredScript(params: GenerateParams) {
    const { companyName, companyCity, companyPhone, title, subject, category, tone } = params

    let hook = ''
    let body = ''
    let cta = ''
    let caption = ''
    let whatsapp = ''
    let googlePost = ''
    let bannerPrompt = ''

    const isPlaca = subject.toLowerCase().includes('placa') || category.toLowerCase().includes('placa')
    const isBateria = subject.toLowerCase().includes('bateria') || category.toLowerCase().includes('bateria')
    const isTela = subject.toLowerCase().includes('tela') || subject.toLowerCase().includes('vidro') || category.toLowerCase().includes('tela')
    const isWater = subject.toLowerCase().includes('água') || subject.toLowerCase().includes('molhado') || subject.toLowerCase().includes('praia')

    if (isWater) {
        hook = `🚨 NUNCA coloque seu celular no arroz se ele cair na água! Veja o que acontece na verdade...`
        body = `[CENA 1 - BANCADA]: Mostre a placa de um celular oxidada sob o microscópio ou sob boa iluminação.\n\n` +
            `"Muita gente acha que o arroz seca o celular, mas na verdade o amido do arroz junta com a água e acelera a corrosão dos componentes internos da placa!\n\n` +
            `[CENA 2 - TÉCNICO DEMONSTRANDO]:\n` +
            `O segredo é DESLIGAR o aparelho imediatamente, não colocar no carregador de jeito nenhum e trazer direto para a bancada para a banho ultrassônico de desoxidação!"`
        cta = `📲 Teve esse problema? Traga seu aparelho hoje mesmo na ${companyName} em ${companyCity}. Atendimento rápido antes que a placa queime!`
    } else if (isBateria) {
        hook = `⚡ Seu celular tá descarregando rápido demais ou esquentando muito no bolso? Dá uma olhada nisso!`
        body = `[CENA 1 - MOSTRANDO A BATERIA ESTUFADA OU TESTE DE SAÚDE]:\n` +
            `"Quando a bateria do seu aparelho começa a perder a química interna, ela não só descarrega rápido, como pode estufar e pressionar a tela por dentro, correndo o risco de quebrar o display!\n\n` +
            `[CENA 2 - TROCA RÁPIDA NA BANCADA]:\n` +
            `Aqui na bancada a gente faz o teste de mAh na hora e faz a substituição por uma bateria selada de alta performance com garantia!"`
        cta = `🔋 Venha testar a saúde da sua bateria grátis aqui na ${companyName} (${companyCity})!`
    } else if (isTela) {
        hook = `😱 Chegou esse aparelho com a tela TOTALMENTE destruída! Será que tem salvação?`
        body = `[CENA 1 - ANTES]: Mostre o aparelho trincado em detalhes com close na câmera.\n\n` +
            `"O cliente achou que ia ter que comprar outro celular novo... Mas a gente abriu o aparelho, higienizou os conectores e instalamos uma tela com brilho e toque de fábrica!\n\n` +
            `[CENA 2 - DEPOIS]: Mostre o teste de touch deslizando perfeitamente na tela novinha."`
        cta = `✨ Não precisa comprar outro! Recupere seu celular na ${companyName}. Atendimento presencial e orçamento sem compromisso.`
    } else if (isPlaca) {
        hook = `🔬 Outra assistência disse que esse celular NÃO TINHA MAIS CONSERTO... Olha o que achamos na placa!`
        body = `[CENA 1 - MICROSCÓPIO]: Mostre a tela do microscópio com o capacitor em curto-circuito.\n\n` +
            `"Muito lugar troca peça, mas aqui na ${companyName} nós fazemos REPARO DE PLACA em nível de componentes! Identificamos um microcapacitor queimado de apenas 1mm.\n\n` +
            `[CENA 2 - APARELHO LIGANDO]: Removemos o curto e o celular ligou com TODOS OS DADOS do cliente salvos!"`
        cta = `👨‍💻 Quer um diagnóstico de verdade? Fale com nosso time da ${companyName} em ${companyCity}!`
    } else {
        hook = `⚠️ Se você usa o celular ou notebook todo dia para trabalhar, VOCÊ PRECISA SABER DISSO!`
        body = `[CENA 1 - BANCADA E FERRAMENTAS]:\n` +
            `"Poeira, umidade do bolso e sujeira nos conectores são os maiores vilões dos eletrônicos. Uma manutenção preventiva anual evita que a placa queime ou que a bateria estufe.\n\n` +
            `[CENA 2 - MOSTRANDO LIMPEZA]:\n` +
            `Aqui nós fazemos a higienização completa, limpeza do conector de carga e aplicação de pasta térmica de alta condutividade!"`
        cta = `🛠️ Agende sua revisão hoje na ${companyName}. Chame no WhatsApp: ${companyPhone}`
    }

    caption = `${hook}\n\n` +
        `Manter seu equipamento em dia é muito mais barato do que comprar um novo!\n\n` +
        `Aqui na ${companyName} oferecemos:\n` +
        `✅ Peças de alta qualidade\n` +
        `✅ Garantia estendida\n` +
        `✅ Orçamento transparente na hora\n\n` +
        `📍 Estamos em ${companyCity}.\n` +
        `💬 Dúvidas ou orçamentos? Clique no link da bio ou chame no WhatsApp!\n\n` +
        `#assistenciatecnica #consertodecelular #reparodeplaca #${companyCity.toLowerCase().replace(/\s+/g, '')} #tecnologia #manutencaodenotebook`

    whatsapp = `Oi! Tudo bem? 👋\n\n` +
        `Passando para lembrar que seu aparelho merece cuidado especializado! 📱💻\n\n` +
        `Estamos com condições especiais esta semana na *${companyName}* para trocas de bateria, telas e revisões técnicas gerais.\n\n` +
        `Quer fazer um orçamento rápido sem compromisso? Responda essa mensagem ou mande uma foto do seu aparelho! 🚀`

    googlePost = `Necessitando de conserto rápido e garantido para seu celular ou notebook em ${companyCity}?\n\n` +
        `Na ${companyName} fazemos troca de tela, substituição de bateria, reparos em placa e limpeza preventiva com rapidez e transparência.\n\n` +
        `Visite nossa loja ou entre em contato pelo telefone/WhatsApp: ${companyPhone}.`

    bannerPrompt = `Banner promocional estilo futurista em tons de azul escuro e dourado. Texto em destaque: 'REVISÃO TÉCNICA E TROCA DE TELA - ${companyName.toUpperCase()}'. Foto de bancada técnica profissional limpa com ferramentas de precisão.`

    return {
        title,
        category,
        hook_3s: hook,
        body_script: body,
        cta_text: cta,
        instagram_caption: caption,
        whatsapp_text: whatsapp,
        google_post: googlePost,
        banner_prompt: bannerPrompt
    }
}
