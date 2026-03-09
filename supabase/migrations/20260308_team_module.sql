-- ==========================================
-- Team Management Module (Equipe)
-- ==========================================

-- 1. Update the role constraint to include 'cashier'
-- Note: We drop and recreate the constraint because PostgreSQL doesn't support direct modification of check constraints easily.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'manager', 'technician', 'customer', 'cashier'));

-- 2. Ensure RLS is enabled on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for users table
DO $$ 
BEGIN 
    -- Policy: Users can view other members of their own company
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can view their company members.') THEN
        CREATE POLICY "Users can view their company members." ON users FOR SELECT 
        USING (company_id IN (SELECT company_id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'));
    END IF;

    -- Policy: Admins/Managers can manage company members (insert/update)
    -- We'll use a simplified check for now: only the company_id needs to match.
    -- More complex checks (role-based) can be added later if needed.
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Admins can manage company members.') THEN
        CREATE POLICY "Admins can manage company members." ON users FOR ALL
        USING (
            company_id IN (SELECT company_id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
            AND 
            (SELECT role FROM users WHERE clerk_id = auth.jwt() ->> 'sub') IN ('admin', 'manager')
        );
    END IF;
END $$;

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
