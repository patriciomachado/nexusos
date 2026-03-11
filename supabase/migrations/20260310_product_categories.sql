-- Migration to add dynamic product categories
CREATE TABLE IF NOT EXISTS public.product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their company's categories" 
ON public.product_categories FOR SELECT 
USING (company_id IN (SELECT company_id FROM public.users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Users can insert categories for their company" 
ON public.product_categories FOR INSERT 
WITH CHECK (company_id IN (SELECT company_id FROM public.users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Users can delete their company's categories" 
ON public.product_categories FOR DELETE 
USING (company_id IN (SELECT company_id FROM public.users WHERE clerk_id = auth.uid()::text));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_product_categories_updated_at
    BEFORE UPDATE ON public.product_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Documentation
COMMENT ON TABLE public.product_categories IS 'Dynamic categories for product inventory management';
