-- Migration: Devices & Public Catalog Module (Nexus Showcase Pro)
-- Date: 2026-08-31

-- 1. Create devices table
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    storage TEXT,
    color TEXT,
    condition TEXT NOT NULL DEFAULT 'seminovo_a', -- novo_lacrado, seminovo_a, seminovo_b, recondicionado
    battery_health INTEGER DEFAULT 100,
    imei_1 TEXT,
    imei_2 TEXT,
    serial_number TEXT,
    cost_price NUMERIC(10, 2) DEFAULT 0,
    cash_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    installment_price NUMERIC(10, 2) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'disponivel', -- disponivel, vendido, reservado, em_revisao
    included_items JSONB DEFAULT '[]'::jsonb,
    images JSONB DEFAULT '[]'::jsonb,
    technical_passport JSONB DEFAULT '{}'::jsonb, -- { is_revised: bool, replaced_parts: [], warranty_months: 6 }
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create catalog_settings table
CREATE TABLE IF NOT EXISTS public.catalog_settings (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
    slug TEXT NOT NULL UNIQUE,
    catalog_title TEXT DEFAULT 'Nosso Catálogo de Aparelhos',
    banner_url TEXT,
    whatsapp_number TEXT,
    motoboy_delivery_fee NUMERIC(10, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create device_trade_ins table
CREATE TABLE IF NOT EXISTS public.device_trade_ins (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_cpf TEXT,
    customer_phone TEXT,
    device_model TEXT NOT NULL,
    imei TEXT,
    assessment_checklist JSONB DEFAULT '{}'::jsonb,
    offered_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'avaliado', -- avaliado, comprado, recusado
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_trade_ins ENABLE ROW LEVEL SECURITY;

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_devices_company_id ON public.devices(company_id);
CREATE INDEX IF NOT EXISTS idx_devices_status ON public.devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_imei ON public.devices(imei_1);
CREATE INDEX IF NOT EXISTS idx_catalog_settings_slug ON public.catalog_settings(slug);
