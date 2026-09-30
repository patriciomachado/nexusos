-- =============================================================================
-- Alice: agente de IA do NexusOS (assistente no app + atendimento no WhatsApp)
--
-- Only adds new tables; no existing table is changed. Safe to run more than once.
-- All access goes through the server (service role): RLS is enabled with no
-- policies, so the anon/authenticated keys cannot read these tables.
-- =============================================================================

-- Configuração por loja (somente admin altera)
CREATE TABLE IF NOT EXISTS alice_settings (
    company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
    -- Assistente dentro do app
    enabled BOOLEAN NOT NULL DEFAULT true,
    -- Papéis (além de admin/owner) que podem usar a Alice no app
    staff_roles TEXT[] NOT NULL DEFAULT '{manager,technician,attendant}',
    -- Informações que a Alice usa para atender clientes (horário, endereço, políticas...)
    store_info TEXT,
    -- WhatsApp (API oficial da Meta)
    whatsapp_enabled BOOLEAN NOT NULL DEFAULT false,
    whatsapp_phone_number_id TEXT UNIQUE,
    whatsapp_access_token TEXT,
    whatsapp_display_phone TEXT,
    whatsapp_verified_name TEXT,
    -- Limite mensal de respostas da IA (controle de custo)
    monthly_limit INTEGER NOT NULL DEFAULT 3000 CHECK (monthly_limit >= 0),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Conversas: no app (por usuário) ou no WhatsApp (por telefone do cliente)
CREATE TABLE IF NOT EXISTS alice_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK (channel IN ('app', 'whatsapp')),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    customer_phone TEXT,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT,
    -- 'alice' = a IA responde · 'human' = um atendente assumiu
    mode TEXT NOT NULL DEFAULT 'alice' CHECK (mode IN ('alice', 'human')),
    title TEXT,
    unread_count INTEGER NOT NULL DEFAULT 0,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Janela de 24h do WhatsApp: só é possível responder livremente dentro dela
    last_customer_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_alice_conv_whatsapp
    ON alice_conversations(company_id, customer_phone) WHERE channel = 'whatsapp';
CREATE INDEX IF NOT EXISTS idx_alice_conv_company_recent
    ON alice_conversations(company_id, channel, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_alice_conv_user
    ON alice_conversations(user_id, last_message_at DESC) WHERE channel = 'app';

-- Mensagens. `content` guarda os blocos no formato da API do Claude (histórico
-- enviado ao modelo); `text` é o que aparece na tela.
CREATE TABLE IF NOT EXISTS alice_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES alice_conversations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    -- user: pessoa (usuário do app ou cliente) · assistant: Alice ·
    -- tool: resultados de ferramentas · staff: atendente humano no WhatsApp ·
    -- event: aviso do sistema (ex.: ação confirmada)
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool', 'staff', 'event')),
    content JSONB NOT NULL DEFAULT '[]'::jsonb,
    text TEXT,
    author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    -- Evita processar a mesma mensagem do WhatsApp duas vezes
    wa_message_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_alice_messages_conv ON alice_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_alice_messages_company_month ON alice_messages(company_id, created_at) WHERE role = 'assistant';

-- Trilha de auditoria: toda consulta e toda ação da Alice
CREATE TABLE IF NOT EXISTS alice_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES alice_conversations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    channel TEXT NOT NULL CHECK (channel IN ('app', 'whatsapp')),
    tool TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('read', 'write')),
    input JSONB NOT NULL DEFAULT '{}'::jsonb,
    summary TEXT,
    -- read: consulta feita · proposed: aguardando confirmação · executed ·
    -- rejected: usuário cancelou · failed · expired · denied: sem permissão
    status TEXT NOT NULL CHECK (status IN ('read', 'proposed', 'executed', 'rejected', 'failed', 'expired', 'denied')),
    result JSONB,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alice_actions_company ON alice_actions(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alice_actions_pending ON alice_actions(conversation_id) WHERE status = 'proposed';

-- Decide uma ação preparada de forma atômica (dois toques em "Confirmar"
-- nunca executam a mesma ação duas vezes). Retorna true se esta chamada decidiu.
CREATE OR REPLACE FUNCTION alice_claim_action(p_id UUID, p_user UUID, p_status TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    changed INTEGER;
BEGIN
    UPDATE alice_actions
       SET status = p_status, decided_at = now()
     WHERE id = p_id
       AND user_id = p_user
       AND status = 'proposed'
       AND p_status IN ('executed', 'rejected', 'expired');
    GET DIAGNOSTICS changed = ROW_COUNT;
    RETURN changed = 1;
END;
$$ LANGUAGE plpgsql;

REVOKE ALL ON FUNCTION alice_claim_action(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION alice_claim_action(UUID, UUID, TEXT) TO service_role;

ALTER TABLE alice_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alice_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE alice_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE alice_actions ENABLE ROW LEVEL SECURITY;

-- Make the new tables visible to the API right away (PostgREST schema cache).
NOTIFY pgrst, 'reload schema';
