-- =============================================================================
-- Caixa: conferência no fechamento, caixas por operador, contas a pagar.
--
-- 1. cash_registers ganha a conferência do fechamento (dinheiro esperado,
--    contado, diferença e o que ficou de troco) e quem fechou.
-- 2. cash_transactions aceita os lançamentos de contas pagas ('bill') e de
--    contas recebidas ('receivable').
-- 3. Nova tabela bills (contas a pagar), com vencimento e repetição mensal.
--    As contas fixas ativas viram contas a pagar mensais e deixam de ser
--    lançadas sozinhas no caixa: agora aparecem no "Seu dia" no vencimento e
--    são pagas pelo caixa ou pelo banco.
--
-- Não apaga nenhum dado. Pode ser rodada mais de uma vez.
-- =============================================================================

-- 1. Conferência do fechamento ------------------------------------------------
ALTER TABLE cash_registers
    ADD COLUMN IF NOT EXISTS expected_cash NUMERIC(15, 2),
    ADD COLUMN IF NOT EXISTS counted_cash NUMERIC(15, 2),
    ADD COLUMN IF NOT EXISTS cash_difference NUMERIC(15, 2),
    ADD COLUMN IF NOT EXISTS left_in_drawer NUMERIC(15, 2),
    ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cash_registers_open_user
    ON cash_registers(company_id, user_id) WHERE status = 'open';

-- 2. Tipos de lançamento --------------------------------------------------------
DO $$
DECLARE
    c RECORD;
BEGIN
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
        'recurring_expense', 'manual', 'bill', 'receivable'
    )) NOT VALID;

-- 3. Contas a pagar -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    due_date DATE NOT NULL,
    repeat_monthly BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'cancelled')),
    paid_at TIMESTAMPTZ,
    paid_amount NUMERIC(15, 2),
    paid_from TEXT CHECK (paid_from IN ('cash', 'bank')),
    cash_transaction_id UUID REFERENCES cash_transactions(id) ON DELETE SET NULL,
    recurring_expense_id UUID,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bills_company_due ON bills(company_id, status, due_date);
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

-- Contas fixas ativas → contas a pagar mensais, com o próximo vencimento.
-- Se a deste mês já foi lançada no caixa, a primeira conta é a do mês que vem.
WITH base AS (
    SELECT r.*,
           date_trunc('month', NOW() AT TIME ZONE 'America/Sao_Paulo')::date AS m0,
           EXISTS (
               SELECT 1 FROM applied_recurring_expenses a
                WHERE a.recurring_expense_id = r.id
                  AND a.month_year = to_char(NOW() AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM')
           ) AS done_this_month
      FROM recurring_expenses r
     WHERE r.is_active
),
target AS (
    SELECT *, CASE WHEN done_this_month THEN (m0 + INTERVAL '1 month')::date ELSE m0 END AS month_start
      FROM base
)
INSERT INTO bills (company_id, description, amount, due_date, repeat_monthly, recurring_expense_id)
SELECT t.company_id,
       t.description,
       t.amount,
       (t.month_start + (LEAST(t.day_of_month, EXTRACT(DAY FROM (t.month_start + INTERVAL '1 month' - INTERVAL '1 day'))::int) - 1))::date,
       TRUE,
       t.id
  FROM target t
 WHERE t.amount > 0
   AND NOT EXISTS (SELECT 1 FROM bills b WHERE b.recurring_expense_id = t.id);

UPDATE recurring_expenses
   SET is_active = FALSE, updated_at = NOW()
 WHERE is_active
   AND id IN (SELECT recurring_expense_id FROM bills WHERE recurring_expense_id IS NOT NULL);

NOTIFY pgrst, 'reload schema';
