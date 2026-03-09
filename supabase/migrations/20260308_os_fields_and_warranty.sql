-- ==============================================================================
-- NEXUS OS - MIGRATION 20260308 - WARRANTY TERMS & COSTS OPTIMIZATION
-- ==============================================================================

-- 1. Warranty Terms & Acceptance
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS warranty_terms TEXT;

ALTER TABLE public.service_orders 
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE;

-- 2. Removal of Time Fields (Replacing with Costs)
-- Service Orders
ALTER TABLE public.service_orders 
DROP COLUMN IF EXISTS estimated_time_minutes,
DROP COLUMN IF EXISTS actual_time_minutes;

-- Service Types (Standards)
ALTER TABLE public.service_types 
DROP COLUMN IF EXISTS estimated_time_minutes,
ADD COLUMN IF NOT EXISTS base_cost DECIMAL(10,2) DEFAULT 0;

-- 3. Documentation
COMMENT ON COLUMN public.companies.warranty_terms IS 'Custom warranty terms defined by the company';
COMMENT ON COLUMN public.service_orders.terms_accepted IS 'Indicates if the customer accepted the terms on check-in';
COMMENT ON COLUMN public.service_types.base_cost IS 'Internal cost standard for this type of service';
COMMENT ON COLUMN public.service_types.base_price IS 'Selling price standard for this type of service';
