-- ==============================================================================
-- ADICIONA CAMPOS DE TERMOS DE GARANTIA E ACEITE
-- ==============================================================================

-- 1. Adiciona coluna de termos de garantia na tabela de empresas
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS warranty_terms TEXT;

-- 2. Adiciona coluna de aceite de termos na tabela de ordens de serviço
ALTER TABLE public.service_orders 
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE;

-- Comentários para documentação
COMMENT ON COLUMN public.companies.warranty_terms IS 'Texto customizado dos termos de garantia da oficina';
COMMENT ON COLUMN public.service_orders.terms_accepted IS 'Indica se o cliente aceitou os termos ao deixar o equipamento';
