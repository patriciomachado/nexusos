-- =============================================================================
-- Alice · Central de WhatsApp (módulos inspirados no WA-AKG):
-- respostas automáticas, agendador, disparo seguro, contatos, grupos, etiquetas,
-- webhooks de saída, anti-spam e comandos do bot.
--
-- Só adiciona tabelas/colunas novas. Idempotente: pode rodar mais de uma vez.
-- Acesso sempre pelo servidor (service role): RLS ligada sem policies.
-- =============================================================================

-- ─── Ajustes por loja ────────────────────────────────────────────────────────
ALTER TABLE alice_settings
    -- Quem recebe respostas automáticas: todos | só os da lista | todos menos os da lista
    ADD COLUMN IF NOT EXISTS autoreply_mode TEXT NOT NULL DEFAULT 'all' CHECK (autoreply_mode IN ('all', 'whitelist', 'blacklist')),
    ADD COLUMN IF NOT EXISTS autoreply_numbers TEXT[] NOT NULL DEFAULT '{}',
    -- Anti-spam: limite de mensagens por número numa janela + pausa "humana" antes de responder
    ADD COLUMN IF NOT EXISTS antispam_enabled BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS antispam_limit INTEGER NOT NULL DEFAULT 6 CHECK (antispam_limit BETWEEN 1 AND 100),
    ADD COLUMN IF NOT EXISTS antispam_window_seconds INTEGER NOT NULL DEFAULT 10 CHECK (antispam_window_seconds BETWEEN 1 AND 3600),
    ADD COLUMN IF NOT EXISTS reply_delay_min_ms INTEGER NOT NULL DEFAULT 0 CHECK (reply_delay_min_ms BETWEEN 0 AND 30000),
    ADD COLUMN IF NOT EXISTS reply_delay_max_ms INTEGER NOT NULL DEFAULT 0 CHECK (reply_delay_max_ms BETWEEN 0 AND 60000),
    -- Presença e boas-vindas
    ADD COLUMN IF NOT EXISTS auto_read BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS always_online BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS welcome_message TEXT,
    -- Comandos do bot (#ping, #figurinha, #ajuda)
    ADD COLUMN IF NOT EXISTS bot_commands_enabled BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS bot_prefix TEXT NOT NULL DEFAULT '#',
    ADD COLUMN IF NOT EXISTS bot_commands_mode TEXT NOT NULL DEFAULT 'trusted' CHECK (bot_commands_mode IN ('trusted', 'all'));

-- ─── Respostas automáticas ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alice_auto_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    match_type TEXT NOT NULL DEFAULT 'contains' CHECK (match_type IN ('exact', 'contains', 'regex')),
    response TEXT,
    media_url TEXT,
    media_type TEXT CHECK (media_type IN ('image', 'video', 'document', 'audio')),
    media_name TEXT,
    -- onde vale: conversa privada, grupo ou os dois
    trigger_type TEXT NOT NULL DEFAULT 'private' CHECK (trigger_type IN ('all', 'private', 'group')),
    enabled BOOLEAN NOT NULL DEFAULT true,
    hits INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (response IS NOT NULL OR media_url IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_alice_auto_replies_company ON alice_auto_replies(company_id) WHERE enabled;

-- ─── Mensagens agendadas ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alice_scheduled_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    -- telefone com DDI (5548...) ou, para grupo, o id do grupo (...@g.us)
    target TEXT NOT NULL,
    target_name TEXT,
    content TEXT,
    media_url TEXT,
    media_type TEXT CHECK (media_type IN ('image', 'video', 'document', 'audio')),
    media_name TEXT,
    send_at TIMESTAMPTZ NOT NULL,
    recurrence TEXT NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'cancelled')),
    last_error TEXT,
    last_sent_at TIMESTAMPTZ,
    sent_count INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (content IS NOT NULL OR media_url IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_alice_scheduled_due ON alice_scheduled_messages(send_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_alice_scheduled_company ON alice_scheduled_messages(company_id, send_at DESC);

-- ─── Disparo seguro (broadcast) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alice_broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title TEXT,
    message TEXT NOT NULL,
    media_url TEXT,
    media_type TEXT CHECK (media_type IN ('image', 'video', 'document', 'audio')),
    media_name TEXT,
    total INTEGER NOT NULL DEFAULT 0,
    sent INTEGER NOT NULL DEFAULT 0,
    failed INTEGER NOT NULL DEFAULT 0,
    -- pausa aleatória entre mensagens (anti-ban)
    delay_min_seconds INTEGER NOT NULL DEFAULT 10 CHECK (delay_min_seconds BETWEEN 3 AND 600),
    delay_max_seconds INTEGER NOT NULL DEFAULT 30 CHECK (delay_max_seconds BETWEEN 3 AND 900),
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'paused', 'completed', 'cancelled')),
    -- só libera o próximo envio depois deste horário (mantém o ritmo mesmo com vários processos)
    next_send_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_alice_broadcasts_company ON alice_broadcasts(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alice_broadcasts_running ON alice_broadcasts(next_send_at) WHERE status = 'running';

CREATE TABLE IF NOT EXISTS alice_broadcast_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broadcast_id UUID NOT NULL REFERENCES alice_broadcasts(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    name TEXT,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
    error TEXT,
    sent_at TIMESTAMPTZ,
    UNIQUE (broadcast_id, phone)
);
CREATE INDEX IF NOT EXISTS idx_alice_broadcast_recipients_pending ON alice_broadcast_recipients(broadcast_id) WHERE status = 'pending';

-- ─── Contatos e grupos do WhatsApp ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alice_wa_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    name TEXT,
    push_name TEXT,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    -- não recebe disparos nem respostas automáticas
    blocked BOOLEAN NOT NULL DEFAULT false,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (company_id, phone)
);
CREATE INDEX IF NOT EXISTS idx_alice_wa_contacts_company ON alice_wa_contacts(company_id, name);

CREATE TABLE IF NOT EXISTS alice_wa_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    jid TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT,
    participants INTEGER NOT NULL DEFAULT 0,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (company_id, jid)
);

-- ─── Etiquetas das conversas ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alice_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#22c55e',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS alice_conversation_labels (
    conversation_id UUID NOT NULL REFERENCES alice_conversations(id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES alice_labels(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    PRIMARY KEY (conversation_id, label_id)
);
CREATE INDEX IF NOT EXISTS idx_alice_conv_labels_label ON alice_conversation_labels(label_id);

-- ─── Webhooks de saída (CRM, n8n, Zapier...) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS alice_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    -- assina o corpo com HMAC-SHA256 (cabeçalho X-Nexus-Signature)
    secret TEXT,
    events TEXT[] NOT NULL DEFAULT '{message.received}',
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alice_webhooks_company ON alice_webhooks(company_id) WHERE enabled;

CREATE TABLE IF NOT EXISTS alice_webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES alice_webhooks(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    event TEXT NOT NULL,
    status_code INTEGER,
    ok BOOLEAN NOT NULL DEFAULT false,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alice_webhook_logs ON alice_webhook_logs(webhook_id, created_at DESC);

-- ─── RLS: só o servidor (service role) acessa ────────────────────────────────
ALTER TABLE alice_auto_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE alice_scheduled_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE alice_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alice_broadcast_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE alice_wa_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alice_wa_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE alice_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE alice_conversation_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE alice_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE alice_webhook_logs ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
