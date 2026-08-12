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
    const companyCity = company?.city ? `${company.city}` : 'nossa cidade'
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
            osDetailsContext = `Aparelho: ${os.equipment_description || 'Equipamento'}. Defeito relatado: ${os.problem_description || 'Falha técnica'}. Reparo realizado: ${os.solution_applied || 'Manutenção concluída na bancada'}.`
        }
    }

    const promptSubject = osDetailsContext || topic || 'Cuidados com Aparelhos Celulares e Computadores na Assistência Técnica'

    // 3. OpenRouter API Call to Claude
    const apiKey = process.env.OPENROUTER_API_KEY
    const primaryModel = 'anthropic/claude-3.5-sonnet'

    if (apiKey) {
        try {
            const systemPrompt = `Você é o principal especialista do Brasil em marketing de conteúdo e roteiros virais para assistências técnicas de celulares, computadores e eletrônicos.
Sua missão é gerar um pacote completo de marketing extremamente persuasivo e focado em atrair clientes locais para a loja.

IMPORTANTE: Você deve responder APENAS um objeto JSON válido (sem texto explicativo antes ou depois), seguindo EXATAMENTE este esquema de chaves:
{
  "title": "Título descritivo curto",
  "hook_3s": "Gancho viral e chocante dos primeiros 3 segundos para parar a rolagem no TikTok/Reels",
  "body_script": "Roteiro da bancada detalhado com indicações de cena [CENA 1 - BANCADA], falas do técnico e demonstrações visuais",
  "cta_text": "Chamada para ação forte e persuasiva convidando o cliente para vir à loja ou mandar mensagem",
  "instagram_caption": "Legenda completa para Instagram/TikTok com introdução engajante, benefícios, endereço local e hashtags do nicho",
  "whatsapp_text": "Texto amigável e direto para Status e Lista de Transmissão do WhatsApp com emojis",
  "google_post": "Publicação otimizada para SEO local no Google Meu Negócio / Google Maps",
  "banner_prompt": "Prompt visual descritivo em português para criar a arte/banner promocional"
}`

            const userPrompt = `
Empresa: ${companyName}
Cidade: ${companyCity}
Contato/Zap: ${companyPhone}
Assunto / Tema: ${promptSubject}
Categoria: ${category}
Tom de Voz: ${tone} (ex: viral, educativo, promocional, bancada)
Formato Desejado: ${targetFormat}

Gere o pacote completo em JSON.`

            const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://nexusgestor.com',
                    'X-Title': 'Nexus Studio AI',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: primaryModel,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.7,
                    response_format: { type: 'json_object' }
                })
            })

            if (openRouterRes.ok) {
                const aiData = await openRouterRes.json()
                const rawContent = aiData.choices?.[0]?.message?.content
                if (rawContent) {
                    try {
                        const parsed = JSON.parse(rawContent)
                        return NextResponse.json({
                            title: parsed.title || titleText,
                            category,
                            hook_3s: parsed.hook_3s || '',
                            body_script: parsed.body_script || '',
                            cta_text: parsed.cta_text || '',
                            instagram_caption: parsed.instagram_caption || '',
                            whatsapp_text: parsed.whatsapp_text || '',
                            google_post: parsed.google_post || '',
                            banner_prompt: parsed.banner_prompt || ''
                        })
                    } catch (e) {
                        console.error('Failed to parse Claude JSON response, falling back:', e)
                    }
                }
            } else {
                const errText = await openRouterRes.text()
                console.error('OpenRouter API returned error:', errText)
            }
        } catch (aiErr) {
            console.error('Error calling OpenRouter Claude API:', aiErr)
        }
    }

    // 4. Fallback Script Engine if OpenRouter API is not set or temporary connection error
    const fallbackResult = generateFallbackScript({
        companyName,
        companyCity,
        companyPhone,
        title: titleText,
        subject: promptSubject,
        category,
        tone
    })

    return NextResponse.json(fallbackResult)
}

interface GenerateParams {
    companyName: string
    companyCity: string
    companyPhone: string
    title: string
    subject: string
    category: string
    tone: string
}

function generateFallbackScript(params: GenerateParams) {
    const { companyName, companyCity, companyPhone, title, subject, category } = params

    let hook = ''
    let body = ''
    let cta = ''

    const isPlaca = subject.toLowerCase().includes('placa') || category.toLowerCase().includes('placa')
    const isBateria = subject.toLowerCase().includes('bateria') || category.toLowerCase().includes('bateria')
    const isTela = subject.toLowerCase().includes('tela') || subject.toLowerCase().includes('vidro')
    const isWater = subject.toLowerCase().includes('água') || subject.toLowerCase().includes('molhado') || subject.toLowerCase().includes('praia')

    if (isWater) {
        hook = `🚨 NUNCA coloque seu celular no arroz se ele cair na água! Veja o que acontece de verdade...`
        body = `[CENA 1 - BANCADA]: Mostre a placa de um celular oxidada sob o microscópio.\n\n` +
            `"O amido do arroz acelera a oxidação interna dos conectores! O certo é desligar imediatamente e trazer para um banho ultrassônico de desoxidação."\n\n` +
            `[CENA 2 - TÉCNICO DEMONSTRANDO]: Mostre a cuba ultrassônica limpando a placa.`
        cta = `📲 Teve esse problema? Traga na ${companyName} em ${companyCity} antes que a placa queime!`
    } else if (isBateria) {
        hook = `⚡ Seu celular tá descarregando rápido demais ou esquentando no bolso? Dá uma olhada nisso!`
        body = `[CENA 1 - TESTE DE SAÚDE]: Mostre o medidor de consumo de corrente na bancada.\n\n` +
            `"Quando a bateria perde a química interna, ela estufa e pode empurrar a tela até quebrar!\n\n` +
            `[CENA 2 - TROCA NA BANCADA]: Substituição por bateria homologada com garantia."`
        cta = `🔋 Teste a saúde da sua bateria grátis hoje na ${companyName} (${companyCity})!`
    } else if (isTela) {
        hook = `😱 Chegou esse aparelho com a tela TOTALMENTE destruída! Será que tem salvação?`
        body = `[CENA 1 - ANTES]: Mostre o aparelho trincado em detalhes.\n\n` +
            `"Fizemos a desmontagem, alinhamos a carcaça e instalamos um display com brilho e toque originais!\n\n` +
            `[CENA 2 - DEPOIS]: Teste fluido de touch screen."`
        cta = `✨ Não precisa comprar outro! Recupere seu celular na ${companyName} em ${companyCity}.`
    } else if (isPlaca) {
        hook = `🔬 Outra assistência disse que esse celular NÃO TINHA CONSERTO... Olha o que achamos!`
        body = `[CENA 1 - MICROSCÓPIO]: Identificando microcapacitor em curto.\n\n` +
            `"Aqui na ${companyName} fazemos reparo em nível de componentes. Trocamos a peça com defeito e salvamos todos os dados do cliente!"`
        cta = `👨‍💻 Quer um diagnóstico de verdade? Fale com a ${companyName} (${companyCity})!`
    } else {
        hook = `⚠️ Se você usa o celular ou notebook para trabalhar, VOCÊ PRECISA SABER DISSO!`
        body = `[CENA 1 - BANCADA]: Mostre o acúmulo de poeira e sujeira interna.\n\n` +
            `"Uma manutenção preventiva limpa o cooler, troca a pasta térmica ressecada e evita a queima da placa!"`
        cta = `🛠️ Agende sua manutenção preventiva na ${companyName}. Chame no WhatsApp: ${companyPhone}`
    }

    const caption = `${hook}\n\n` +
        `Manter seu equipamento em dia sai muito mais barato do que comprar um novo!\n\n` +
        `Aqui na ${companyName} você encontra:\n` +
        `✅ Peças com garantia estendida\n` +
        `✅ Diagnóstico rápido e transparente\n` +
        `✅ Equipe especializada\n\n` +
        `📍 Atendendo em ${companyCity}.\n` +
        `💬 WhatsApp: ${companyPhone}\n\n` +
        `#assistenciatecnica #consertodecelular #reparodeplaca #${companyCity.toLowerCase().replace(/\s+/g, '')} #tecnologia`

    const whatsapp = `Oi! Tudo bem? 👋\n\n` +
        `Passando para lembrar que seu aparelho merece cuidado especializado! 📱💻\n\n` +
        `Estamos com condições especiais esta semana na *${companyName}* para trocas de bateria, telas e revisões técnicas gerais.\n\n` +
        `Quer fazer um orçamento rápido sem compromisso? Responda essa mensagem ou mande uma foto do seu aparelho! 🚀`

    const googlePost = `Necessitando de conserto rápido e garantido para seu celular ou computador em ${companyCity}?\n\n` +
        `Na ${companyName} fazemos troca de tela, substituição de bateria, reparos em placa e limpeza preventiva com rapidez e transparência.\n\n` +
        `Visite nossa loja ou entre em contato pelo telefone/WhatsApp: ${companyPhone}.`

    const bannerPrompt = `Banner promocional estilo futurista em tons de azul e dourado com logotipo '${companyName}'. Texto: 'REVISÃO TÉCNICA E TROCA DE TELA EM ${companyCity.toUpperCase()}'.`

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
