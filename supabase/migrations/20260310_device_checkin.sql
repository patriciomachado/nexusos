-- ==============================================================================
-- NEXUS OS - MIGRATION 20260310 - DEVICE CHECK-IN & PHOTOS
-- ==============================================================================

-- 1. Add check-in fields to service_orders
ALTER TABLE public.service_orders 
ADD COLUMN IF NOT EXISTS device_condition TEXT,
ADD COLUMN IF NOT EXISTS turns_on BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS photo_front_url TEXT,
ADD COLUMN IF NOT EXISTS photo_back_url TEXT;

-- 2. Documentation
COMMENT ON COLUMN public.service_orders.device_condition IS 'Detailed physical state of the device at check-in';
COMMENT ON COLUMN public.service_orders.turns_on IS 'Indicates if the device powers on at check-in';
COMMENT ON COLUMN public.service_orders.photo_front_url IS 'URL of the device frontal photo';
COMMENT ON COLUMN public.service_orders.photo_back_url IS 'URL of the device back photo';

-- 3. Storage bucket (This usually needs to be done via Supabase Dashboard or API, 
-- but we can attempt to document the requirement here. 
-- For the MCP tool, we will assume the bucket 'os-photos' exists or should be created.)
