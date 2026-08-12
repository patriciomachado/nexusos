-- Create studio_scripts table
CREATE TABLE IF NOT EXISTS studio_scripts (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'Geral',
    source_type TEXT DEFAULT 'manual', -- 'seasonal', 'os', 'manual', 'bancada'
    source_id UUID, -- optional service_order_id
    hook_3s TEXT NOT NULL,
    body_script TEXT NOT NULL,
    cta_text TEXT NOT NULL,
    instagram_caption TEXT,
    whatsapp_text TEXT,
    google_post TEXT,
    banner_prompt TEXT,
    is_favorite BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for studio_scripts
ALTER TABLE studio_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's studio scripts"
ON studio_scripts FOR SELECT
USING (company_id IN (SELECT company_id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));

CREATE POLICY "Users can insert their company's studio scripts"
ON studio_scripts FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));

CREATE POLICY "Users can update their company's studio scripts"
ON studio_scripts FOR UPDATE
USING (company_id IN (SELECT company_id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));

CREATE POLICY "Users can delete their company's studio scripts"
ON studio_scripts FOR DELETE
USING (company_id IN (SELECT company_id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));
