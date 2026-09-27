-- Studio de conteúdo volta ao app: posts salvos com status, textos por canal
-- (cada um gerado só quando pedido) e controle de uso da IA.

CREATE TABLE IF NOT EXISTS studio_scripts (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'Geral',
    source_type TEXT DEFAULT 'manual',
    source_id UUID,
    hook_3s TEXT,
    body_script TEXT,
    cta_text TEXT,
    instagram_caption TEXT,
    whatsapp_text TEXT,
    google_post TEXT,
    banner_prompt TEXT,
    is_favorite BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE studio_scripts ENABLE ROW LEVEL SECURITY;

-- Textos agora são gerados um canal por vez: nenhum é obrigatório.
ALTER TABLE studio_scripts ALTER COLUMN hook_3s DROP NOT NULL;
ALTER TABLE studio_scripts ALTER COLUMN body_script DROP NOT NULL;
ALTER TABLE studio_scripts ALTER COLUMN cta_text DROP NOT NULL;

-- ideia → pronto → publicado; data prevista para o calendário de conteúdo.
ALTER TABLE studio_scripts
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ideia',
    ADD COLUMN IF NOT EXISTS scheduled_for DATE,
    ADD COLUMN IF NOT EXISTS art JSONB NOT NULL DEFAULT '{}'::jsonb;

-- source_id também guarda o id da data comemorativa (texto), não só UUID.
ALTER TABLE studio_scripts ALTER COLUMN source_id TYPE TEXT USING source_id::text;

CREATE INDEX IF NOT EXISTS idx_studio_scripts_company ON studio_scripts(company_id, created_at DESC);

-- Cada chamada à IA, com os tokens gastos: base da cota mensal e do custo real por loja.
CREATE TABLE IF NOT EXISTS ai_usage (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    feature TEXT NOT NULL,          -- 'studio'
    kind TEXT,                      -- 'instagram', 'whatsapp', 'google', 'roteiro'
    model TEXT NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ai_usage_company_month ON ai_usage(company_id, feature, created_at DESC);
