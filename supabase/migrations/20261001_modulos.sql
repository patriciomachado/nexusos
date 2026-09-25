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
