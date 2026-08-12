-- Migration to ensure applied_recurring_expenses has month_year and company_id columns
ALTER TABLE applied_recurring_expenses 
ADD COLUMN IF NOT EXISTS month_year TEXT,
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
