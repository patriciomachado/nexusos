-- =============================================================================
-- Orçamento automático de peças: mão de obra mínima (além da margem sobre a
-- peça), link do site do fornecedor e opção da Alice cotar direto no WhatsApp.
-- Idempotente: pode rodar mais de uma vez.
-- =============================================================================

-- Link do catálogo do fornecedor, pra abrir direto na hora de conferir o preço.
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS site_url VARCHAR(300);

-- Quando ligado, a Alice manda os preços já cadastrados direto ao cliente no
-- WhatsApp; quando desligado (padrão), ela calcula e manda para a loja
-- confirmar antes de responder (mesmo comportamento de hoje, só que com o
-- valor já pronto na tarefa).
ALTER TABLE alice_settings ADD COLUMN IF NOT EXISTS auto_quote_parts BOOLEAN NOT NULL DEFAULT false;

NOTIFY pgrst, 'reload schema';
