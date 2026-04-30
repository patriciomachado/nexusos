-- Add financial management columns to companies
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS cash_cycle TEXT DEFAULT 'monthly' CHECK (cash_cycle IN ('daily', 'monthly')),
ADD COLUMN IF NOT EXISTS auto_close_cash BOOLEAN DEFAULT true;

-- Create recurring_expenses table
CREATE TABLE IF NOT EXISTS recurring_expenses (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    day_of_month INTEGER NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 31),
    transaction_type_id UUID REFERENCES transaction_types(id),
    payment_method_id UUID REFERENCES payment_methods(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create applied_recurring_expenses table to track which expenses were already applied to which cash register
CREATE TABLE IF NOT EXISTS applied_recurring_expenses (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    recurring_expense_id UUID NOT NULL REFERENCES recurring_expenses(id) ON DELETE CASCADE,
    cash_register_id UUID NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
    applied_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(recurring_expense_id, cash_register_id)
);

-- Enable RLS
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE applied_recurring_expenses ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies for recurring_expenses
CREATE POLICY "Users can view their company's recurring expenses"
ON recurring_expenses FOR SELECT
USING (company_id IN (SELECT company_id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));

CREATE POLICY "Users can insert their company's recurring expenses"
ON recurring_expenses FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));

CREATE POLICY "Users can update their company's recurring expenses"
ON recurring_expenses FOR UPDATE
USING (company_id IN (SELECT company_id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));

CREATE POLICY "Users can delete their company's recurring expenses"
ON recurring_expenses FOR DELETE
USING (company_id IN (SELECT company_id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));

-- Add RLS Policies for applied_recurring_expenses
CREATE POLICY "Users can view their company's applied recurring expenses"
ON applied_recurring_expenses FOR SELECT
USING (cash_register_id IN (SELECT id FROM cash_registers WHERE company_id IN (SELECT company_id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')));

CREATE POLICY "Users can insert their company's applied recurring expenses"
ON applied_recurring_expenses FOR INSERT
WITH CHECK (cash_register_id IN (SELECT id FROM cash_registers WHERE company_id IN (SELECT company_id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')));
