-- =============================================================================
-- Orçamentos: saber quais viraram OS, estatísticas e lembrete de orçamento
-- parado (tarefa, algumas horas depois, sem confirmação automática).
-- Idempotente: pode rodar mais de uma vez.
-- =============================================================================

ALTER TABLE part_quotes ADD COLUMN IF NOT EXISTS service_order_id UUID REFERENCES service_orders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_part_quotes_service_order ON part_quotes(service_order_id) WHERE service_order_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
