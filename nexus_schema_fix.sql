-- NEXUS OS: Schema Synchronization Script
-- This script ensures all required tables and columns exist in your Supabase database.

-- 1. Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Ensure Service Orders has the missing column
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS estimated_time_minutes INTEGER;

-- 3. Ensure all core tables exist (Only creates if not already there)
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    cnpj TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    logo_url TEXT,
    subscription_plan TEXT DEFAULT 'free',
    subscription_status TEXT DEFAULT 'active',
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    max_users INTEGER DEFAULT 5,
    max_os_per_month INTEGER DEFAULT 100,
    warranty_terms TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_id TEXT UNIQUE NOT NULL,
    company_id UUID REFERENCES public.companies(id),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'technician',
    is_active BOOLEAN DEFAULT TRUE,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    cpf_cnpj TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    birth_date DATE,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.technicians (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id),
    user_id UUID REFERENCES public.users(id),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    specialties JSONB,
    certifications JSONB,
    hourly_rate DECIMAL(10,2),
    commission_type TEXT,
    commission_value DECIMAL(10,2),
    availability_schedule JSONB,
    tools_equipment JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    average_completion_time INTEGER,
    performance_rating DECIMAL(3,2),
    total_os_completed INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.service_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id),
    name TEXT NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2),
    base_cost DECIMAL(10,2),
    checklist_items JSONB,
    requires_before_photo BOOLEAN DEFAULT FALSE,
    requires_after_photo BOOLEAN DEFAULT FALSE,
    custom_fields JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.service_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id),
    order_number TEXT NOT NULL,
    customer_id UUID REFERENCES public.customers(id),
    technician_id UUID REFERENCES public.technicians(id),
    service_type_id UUID REFERENCES public.service_types(id),
    status TEXT DEFAULT 'aberta',
    priority TEXT DEFAULT 'normal',
    title TEXT NOT NULL,
    description TEXT,
    problem_description TEXT,
    solution_applied TEXT,
    equipment_description TEXT,
    equipment_serial TEXT,
    estimated_time_minutes INTEGER,
    estimated_cost DECIMAL(10,2),
    parts_cost DECIMAL(10,2),
    labor_cost DECIMAL(10,2),
    final_cost DECIMAL(10,2),
    scheduled_date TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    internal_notes TEXT,
    customer_notes TEXT,
    warranty_months INTEGER DEFAULT 0,
    terms_accepted BOOLEAN DEFAULT FALSE,
    signature_url TEXT,
    checklist_progress JSONB,
    tracking_token TEXT,
    cash_transaction_id UUID, -- Link after cash tables
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.service_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
    inventory_item_id UUID,
    item_name TEXT NOT NULL,
    quantity DECIMAL(10,2) DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.service_order_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES public.users(id),
    changed_by_name TEXT,
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    change_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id),
    name TEXT NOT NULL,
    sku TEXT,
    barcode TEXT,
    description TEXT,
    category TEXT,
    unit TEXT DEFAULT 'un',
    cost_price DECIMAL(10,2),
    selling_price DECIMAL(10,2),
    quantity_in_stock DECIMAL(10,2) DEFAULT 0,
    minimum_quantity DECIMAL(10,2) DEFAULT 0,
    maximum_quantity DECIMAL(10,2),
    serial_number_required BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id), -- NULL means system default
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure company_id exists and drop legacy unique constraints
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.payment_methods DROP CONSTRAINT IF EXISTS payment_methods_name_key;
ALTER TABLE public.payment_methods DROP CONSTRAINT IF EXISTS payment_methods_code_key;
ALTER TABLE public.payment_methods DROP CONSTRAINT IF EXISTS payment_methods_company_code_unique;
ALTER TABLE public.payment_methods ADD CONSTRAINT payment_methods_company_code_unique UNIQUE (company_id, code);

-- Same for transaction_types if needed
ALTER TABLE public.transaction_types DROP CONSTRAINT IF EXISTS transaction_types_name_key;
ALTER TABLE public.transaction_types DROP CONSTRAINT IF EXISTS transaction_types_code_key;

CREATE TABLE IF NOT EXISTS public.cash_registers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE,
    opening_balance DECIMAL(15,2) NOT NULL,
    closing_balance DECIMAL(15,2),
    status TEXT DEFAULT 'open' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transaction_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL, -- income, expense
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cash_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cash_register_id UUID NOT NULL REFERENCES public.cash_registers(id),
    user_id UUID NOT NULL REFERENCES public.users(id),
    payment_method_id UUID NOT NULL REFERENCES public.payment_methods(id),
    transaction_type_id UUID REFERENCES public.transaction_types(id),
    type TEXT NOT NULL, -- entry, exit
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    justification TEXT,
    source_type TEXT, -- sale, os, manual
    source_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Initial Payment Methods (System Defaults)
INSERT INTO public.payment_methods (name, code, company_id) VALUES 
('Dinheiro', 'CASH', NULL),
('Cartão de Débito', 'DEBIT_CARD', NULL),
('Cartão de Crédito', 'CREDIT_CARD', NULL),
('PIX', 'PIX', NULL),
('Cheque', 'CHEQUE', NULL),
('Crediário', 'INSTALLMENT', NULL)
ON CONFLICT (company_id, code) DO NOTHING;

-- 5. Re-add specific missing columns manually as failsafe
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS estimated_time_minutes INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS warranty_terms TEXT;
