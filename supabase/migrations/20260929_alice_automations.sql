-- =============================================================================
-- Estilo e automações da Alice: tom de voz, uso de emoji, palavras-chave que
-- chamam um atendente na hora, e horário de atendimento (com mensagem de
-- fora do expediente). Only adds columns; no existing data changes.
-- Idempotente.
-- =============================================================================

ALTER TABLE alice_settings
    ADD COLUMN IF NOT EXISTS tone TEXT NOT NULL DEFAULT 'professional'
        CHECK (tone IN ('professional', 'friendly', 'casual', 'custom')),
    ADD COLUMN IF NOT EXISTS tone_custom TEXT,
    ADD COLUMN IF NOT EXISTS emoji_usage TEXT NOT NULL DEFAULT 'moderate'
        CHECK (emoji_usage IN ('none', 'moderate', 'frequent')),
    ADD COLUMN IF NOT EXISTS escalation_keywords TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS business_hours JSONB NOT NULL DEFAULT '{"enabled": false, "days": {}, "after_hours_message": null}'::jsonb;

NOTIFY pgrst, 'reload schema';
