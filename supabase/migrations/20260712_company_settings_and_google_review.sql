-- Add missing columns required by DashboardOnboarding flow
-- These fields are sent in PUT /api/company/[id] but were never added to the table,
-- causing the entire UPDATE to fail silently (rollback) and lose ALL onboarding data.

ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS google_review_url TEXT,
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.companies.google_review_url IS 'Public Google Review URL shared with customers after OS completion';
COMMENT ON COLUMN public.companies.settings IS 'Free-form JSON config (segment, integrations flags, etc.)';
