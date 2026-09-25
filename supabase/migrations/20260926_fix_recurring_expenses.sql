-- =============================================================================
-- Contas fixas não entravam no caixa.
--
-- A restrição de cash_transactions.source_type só aceitava os tipos originais
-- ('service_order', 'product_sale', 'manual_sangria', 'manual_suprimento'),
-- então todo lançamento de conta fixa ('recurring_expense') era recusado pelo
-- banco. Esta migration amplia a lista. Não altera nem apaga nenhum dado.
-- Safe to run more than once.
-- =============================================================================

DO $$
DECLARE
    c RECORD;
BEGIN
    -- Drop whatever CHECK currently constrains source_type (name may vary).
    FOR c IN
        SELECT conname
          FROM pg_constraint
         WHERE conrelid = 'cash_transactions'::regclass
           AND contype = 'c'
           AND pg_get_constraintdef(oid) ILIKE '%source_type%'
    LOOP
        EXECUTE format('ALTER TABLE cash_transactions DROP CONSTRAINT %I', c.conname);
    END LOOP;
END $$;

ALTER TABLE cash_transactions
    ADD CONSTRAINT cash_transactions_source_type_check
    CHECK (source_type IS NULL OR source_type IN (
        'service_order', 'product_sale', 'manual_sangria', 'manual_suprimento',
        'recurring_expense', 'manual'
    )) NOT VALID; -- existing rows already passed the old, narrower rule

-- Controle mensal das contas fixas (colunas criadas em 20260812, garantidas aqui).
ALTER TABLE applied_recurring_expenses
    ADD COLUMN IF NOT EXISTS month_year TEXT,
    ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_applied_recurring_month
    ON applied_recurring_expenses(recurring_expense_id, month_year);
CREATE INDEX IF NOT EXISTS idx_cash_tx_recurring
    ON cash_transactions(source_id, created_at) WHERE source_type = 'recurring_expense';

NOTIFY pgrst, 'reload schema';
