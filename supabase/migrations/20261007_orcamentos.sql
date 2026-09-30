-- =============================================================================
-- Orçamento com link próprio: quando a Alice cota uma peça (ex.: troca de
-- tela) pro cliente, grava as opções cotadas com um link público, pra mandar
-- em vez de só o valor solto no texto.
-- Idempotente: pode rodar mais de uma vez.
-- =============================================================================

CREATE TABLE IF NOT EXISTS part_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    token VARCHAR(40) NOT NULL UNIQUE,
    device_model VARCHAR(120) NOT NULL,
    service VARCHAR(120) NOT NULL,
    options JSONB NOT NULL DEFAULT '[]',
    customer_name VARCHAR(120),
    customer_phone VARCHAR(40),
    valid_until TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_part_quotes_company ON part_quotes(company_id, created_at DESC);
-- Sem política pública: a página de orçamento e a criação pela Alice usam o
-- client de serviço (mesmo padrão do link de acompanhamento de OS).
ALTER TABLE part_quotes ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
