-- =============================================================================
-- Alice: Instagram Direct como segundo canal de DM, junto do WhatsApp.
-- Idempotente: pode rodar mais de uma vez.
-- =============================================================================

ALTER TABLE alice_settings
    ADD COLUMN IF NOT EXISTS instagram_enabled BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS instagram_account_id TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS instagram_access_token TEXT,
    ADD COLUMN IF NOT EXISTS instagram_username TEXT;

ALTER TABLE alice_conversations
    ADD COLUMN IF NOT EXISTS instagram_id TEXT,
    ADD COLUMN IF NOT EXISTS instagram_username TEXT;

-- Amplia o canal pra incluir 'instagram' (constraint recriada; nome do WhatsApp mantido no 'app').
ALTER TABLE alice_conversations DROP CONSTRAINT IF EXISTS alice_conversations_channel_check;
ALTER TABLE alice_conversations ADD CONSTRAINT alice_conversations_channel_check
    CHECK (channel IN ('app', 'whatsapp', 'instagram'));

ALTER TABLE alice_actions DROP CONSTRAINT IF EXISTS alice_actions_channel_check;
ALTER TABLE alice_actions ADD CONSTRAINT alice_actions_channel_check
    CHECK (channel IN ('app', 'whatsapp', 'instagram'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_alice_conv_instagram
    ON alice_conversations(company_id, instagram_id) WHERE channel = 'instagram';

-- Novo contato pelo Instagram também vira lead no Funil, como já acontece com o WhatsApp.
ALTER TABLE funnel_entries DROP CONSTRAINT IF EXISTS funnel_entries_source_check;
ALTER TABLE funnel_entries ADD CONSTRAINT funnel_entries_source_check
    CHECK (source IN ('manual', 'whatsapp', 'alice', 'landing', 'indicacao', 'instagram'));

NOTIFY pgrst, 'reload schema';
