-- =============================================================================
-- Números de confiança da Alice: liga um WhatsApp (o número pessoal de um
-- admin/gerente) a um usuário do sistema. Quando esse número manda mensagem
-- para o WhatsApp da loja, a Alice atende como equipe (consultas de caixa,
-- OS, agenda etc.) em vez de como cliente.
--
-- Only adds a new table; no existing table changes. RLS enabled with no
-- policies — acesso só pelo servidor, mesmo padrão das outras tabelas da
-- Alice. Idempotente.
-- =============================================================================

CREATE TABLE IF NOT EXISTS alice_trusted_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alice_trusted_company ON alice_trusted_numbers(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_alice_trusted_user ON alice_trusted_numbers(company_id, user_id);

ALTER TABLE alice_trusted_numbers ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
