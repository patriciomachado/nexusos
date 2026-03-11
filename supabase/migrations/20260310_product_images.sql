-- ==============================================================================
-- NEXUS OS - MIGRATION 20260310 - PRODUCT IMAGES
-- ==============================================================================

-- 1. Add image_url to inventory_items
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Documentation
COMMENT ON COLUMN public.inventory_items.image_url IS 'Public URL for the product image stored in Supabase Storage';
