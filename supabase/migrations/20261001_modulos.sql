-- =============================================================================
-- Módulos: PDV (devoluções), aparelhos, clientes, equipe e configurações.
-- Não apaga nenhum dado. Pode ser rodada mais de uma vez.
-- =============================================================================

-- PDV: devoluções ------------------------------------------------------------
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS returned_quantity NUMERIC(10, 3) NOT NULL DEFAULT 0;

DO $$
DECLARE
    c RECORD;
BEGIN
    FOR c IN
        SELECT conname FROM pg_constraint
         WHERE conrelid = 'cash_transactions'::regclass AND contype = 'c'
           AND pg_get_constraintdef(oid) ILIKE '%source_type%'
    LOOP
        EXECUTE format('ALTER TABLE cash_transactions DROP CONSTRAINT %I', c.conname);
    END LOOP;
END $$;

ALTER TABLE cash_transactions
    ADD CONSTRAINT cash_transactions_source_type_check
    CHECK (source_type IS NULL OR source_type IN (
        'service_order', 'product_sale', 'manual_sangria', 'manual_suprimento',
        'recurring_expense', 'manual', 'bill', 'receivable', 'refund', 'device_sale', 'device_purchase'
    )) NOT VALID;

-- Aparelhos: venda, garantia, custos extras e checklist de teste ---------------
ALTER TABLE devices
    ADD COLUMN IF NOT EXISTS extra_costs NUMERIC(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS test_checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS warranty_months INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN IF NOT EXISTS sold_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS sold_price NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS sold_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS warranty_until DATE,
    ADD COLUMN IF NOT EXISTS trade_in_id UUID;

ALTER TABLE device_trade_ins
    ADD COLUMN IF NOT EXISTS photos JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS reference_price NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS suggested_price NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS device_id UUID,
    ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_devices_warranty ON devices(company_id, warranty_until) WHERE status = 'vendido';

-- Clientes: etiquetas e registro das mensagens automáticas/campanhas -----------
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_customers_tags ON customers USING GIN (tags);

CREATE TABLE IF NOT EXISTS customer_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    kind TEXT NOT NULL,          -- birthday, review, campaign
    ref TEXT NOT NULL,           -- what it was about (year, OS id, campaign id…)
    text TEXT,
    status TEXT NOT NULL DEFAULT 'sent',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, kind, ref)
);
CREATE INDEX IF NOT EXISTS idx_customer_messages_customer ON customer_messages(customer_id, created_at DESC);
ALTER TABLE customer_messages ENABLE ROW LEVEL SECURITY;

-- Contas a receber canceladas ficam como 'cancelled'.
DO $$
DECLARE
    c RECORD;
BEGIN
    FOR c IN
        SELECT conname FROM pg_constraint
         WHERE conrelid = 'payments'::regclass AND contype = 'c'
           AND pg_get_constraintdef(oid) ILIKE '%payment_status%'
    LOOP
        EXECUTE format('ALTER TABLE payments DROP CONSTRAINT %I', c.conname);
    END LOOP;
END $$;
ALTER TABLE payments
    ADD CONSTRAINT payments_payment_status_check
    CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded', 'partial', 'cancelled')) NOT VALID;

NOTIFY pgrst, 'reload schema';
