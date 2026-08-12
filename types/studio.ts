export interface StudioScript {
    id: string
    company_id: string
    user_id?: string | null
    title: string
    category: string
    source_type: 'seasonal' | 'os' | 'manual' | 'bancada'
    source_id?: string | null
    hook_3s: string
    body_script: string
    cta_text: string
    instagram_caption: string
    whatsapp_text: string
    google_post: string
    banner_prompt?: string | null
    is_favorite?: boolean
    created_at: string
}

export interface SeasonalEvent {
    id: string
    month: number // 1-12
    day: number
    title: string
    category: 'nacional' | 'tech' | 'comercial' | 'estacao'
    description: string
    suggestedTopic: string
    badge: string
}
