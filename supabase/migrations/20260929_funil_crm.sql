-- =============================================================================
-- Funil de vendas (CRM): pipeline com os estágios do fluxo que a loja já usa —
-- Lead/Contato → Orçamento enviado → Negociação → Fechado → Perdido — ligado
-- aos clientes, orçamentos de peças, ordens de serviço e vendas já existentes.
--
-- Only adds a new table; no existing table changes. RLS enabled with no
-- policies: o acesso é só pelo servidor (service role), mesmo padrão do
-- restante do app (ex.: alice_conversations). Idempotente.
-- =============================================================================

CREATE TABLE IF NOT EXISTS funnel_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Cliente já cadastrado, ou um lead ainda sem cadastro (nome/telefone soltos).
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    lead_name TEXT,
    lead_phone TEXT,

    title TEXT NOT NULL,
    stage TEXT NOT NULL DEFAULT 'lead' CHECK (stage IN ('lead', 'orcamento', 'negociacao', 'fechado', 'perdido')),
    value_estimate NUMERIC(10, 2) NOT NULL DEFAULT 0,
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'whatsapp', 'alice', 'landing', 'indicacao')),

    -- Liga o cartão ao que já existe no sistema, quando aplicável.
    quote_id UUID REFERENCES part_quotes(id) ON DELETE SET NULL,
    service_order_id UUID REFERENCES service_orders(id) ON DELETE SET NULL,
    sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,

    lost_reason TEXT,
    notes TEXT,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,

    stage_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funnel_company_stage ON funnel_entries(company_id, stage, stage_changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_funnel_customer ON funnel_entries(customer_id) WHERE customer_id IS NOT NULL;

ALTER TABLE funnel_entries ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
