-- =============================================================================
-- Produtos (histórico de estoque, fornecedor e local) e agenda (técnico
-- opcional, duração, lembrete). Não apaga nenhum dado. Pode ser rodada mais de
-- uma vez.
-- =============================================================================

-- Produtos: fornecedor e onde fica na loja -------------------------------------
ALTER TABLE inventory_items
    ADD COLUMN IF NOT EXISTS supplier TEXT,
    ADD COLUMN IF NOT EXISTS location TEXT;

-- Produtos: cada entrada e saída de estoque -----------------------------------
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    quantity NUMERIC(10, 3) NOT NULL,          -- positivo entra, negativo sai
    balance NUMERIC(10, 3),                    -- estoque depois do movimento
    kind TEXT NOT NULL,                        -- entrada, saida, ajuste, venda, devolucao, os
    reason TEXT,
    unit_cost NUMERIC(10, 2),
    ref_id UUID,                               -- venda, OS…
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item ON inventory_movements(item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_company ON inventory_movements(company_id, created_at DESC);
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- Agenda: técnico opcional e lembrete ------------------------------------------
ALTER TABLE appointments ALTER COLUMN technician_id DROP NOT NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_appointments_company_date ON appointments(company_id, scheduled_date);
