-- ==============================================================================
-- ATUALIZAÇÃO DO BANCO DE DADOS (SUPABASE)
-- Correção da constraint de cargos para incluir o novo cargo "Atendente (OS e PDV)"
-- ==============================================================================

-- 1. Remove a restrição (constraint) antiga que valida os cargos
ALTER TABLE "public"."users" 
DROP CONSTRAINT IF EXISTS "users_role_check";

-- 2. Adiciona a nova restrição incluindo o cargo 'attendant'
ALTER TABLE "public"."users" 
ADD CONSTRAINT "users_role_check" 
CHECK (role IN ('admin', 'manager', 'technician', 'cashier', 'customer', 'attendant'));

-- ==============================================================================
-- TABELA COMPLETA (Caso você precise recriar a tabela users do zero)
-- ==============================================================================
/*
CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "clerk_id" text NOT NULL,
    "email" text NOT NULL,
    "full_name" text,
    "company_id" uuid,
    "role" text DEFAULT 'customer'::text NOT NULL,
    "phone" text,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "users_clerk_id_key" UNIQUE ("clerk_id"),
    CONSTRAINT "users_email_key" UNIQUE ("email"),
    CONSTRAINT "users_role_check" CHECK (role IN ('admin', 'manager', 'technician', 'cashier', 'customer', 'attendant'))
);
*/
