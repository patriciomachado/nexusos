import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

const openrouter = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
});

export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages } = await req.json();

    const result = streamText({
        model: openrouter('openai/gpt-4o-mini'),
        messages,
        system: "Você é o Nexus, um assistente virtual inteligente integrado ao Nexus OS. Você ajuda o usuário a gerenciar ordem de serviços, técnicos, clientes, estoque e finanças. Seja prestativo, claro, objetivo e comunique-se em português do Brasil.",
    });

    return result.toTextStreamResponse();
}
