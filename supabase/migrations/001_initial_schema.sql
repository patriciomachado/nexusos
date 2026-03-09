-- ============================================
-- NEXUS OS - SUPABASE MIGRATION
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: companies
-- ============================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  cnpj VARCHAR(20) UNIQUE,
  email VARCHAR(255),
  phone VARCHAR(20),
  address VARCHAR(500),
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  logo_url VARCHAR(500),
  subscription_plan VARCHAR(20) DEFAULT 'essencial' CHECK (subscription_plan IN ('essencial', 'profissional', 'avancado')),
  subscription_status VARCHAR(20) DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'trial')),
  subscription_end_date DATE,
  max_users INTEGER DEFAULT 3,
  max_os_per_month INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: users
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  phone VARCHAR(20),
  avatar_url VARCHAR(500),
  role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('admin', 'manager', 'technician', 'customer')),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: customers
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  cpf_cnpj VARCHAR(20),
  address VARCHAR(500),
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  birth_date DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: technicians
-- ============================================
CREATE TABLE IF NOT EXISTS technicians (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  specialties JSONB DEFAULT '[]',
  hourly_rate DECIMAL(10,2) DEFAULT 0,
  commission_type VARCHAR(20) DEFAULT 'percentage' CHECK (commission_type IN ('per_os', 'per_value', 'percentage')),
  commission_value DECIMAL(10,2) DEFAULT 0,
  tools_equipment JSONB DEFAULT '[]',
  certifications JSONB DEFAULT '[]',
  availability_schedule JSONB DEFAULT '{}',
  performance_rating DECIMAL(3,2) DEFAULT 0,
  total_os_completed INTEGER DEFAULT 0,
  average_completion_time INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: service_types
-- ============================================
CREATE TABLE IF NOT EXISTS service_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  estimated_time_minutes INTEGER DEFAULT 60,
  base_price DECIMAL(10,2) DEFAULT 0,
  custom_fields JSONB DEFAULT '[]',
  requires_before_photo BOOLEAN DEFAULT FALSE,
  requires_after_photo BOOLEAN DEFAULT FALSE,
  checklist_items JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: inventory_items
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  description TEXT,
  category VARCHAR(100),
  cost_price DECIMAL(10,2) DEFAULT 0,
  selling_price DECIMAL(10,2) DEFAULT 0,
  quantity_in_stock DECIMAL(10,3) DEFAULT 0,
  minimum_quantity DECIMAL(10,3) DEFAULT 0,
  maximum_quantity DECIMAL(10,3) DEFAULT 999999,
  unit VARCHAR(20) DEFAULT 'un' CHECK (unit IN ('un', 'kg', 'm', 'l', 'cx', 'pc', 'par')),
  barcode VARCHAR(100),
  serial_number_required BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: service_orders
-- ============================================
CREATE TABLE IF NOT EXISTS service_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  order_number VARCHAR(50) NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
  service_type_id UUID REFERENCES service_types(id) ON DELETE SET NULL,
  status VARCHAR(30) DEFAULT 'aberta' CHECK (status IN ('aberta', 'agendada', 'em_andamento', 'aguardando_pecas', 'concluida', 'faturada', 'cancelada')),
  priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('baixa', 'normal', 'alta', 'urgente')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  problem_description TEXT,
  solution_applied TEXT,
  equipment_description VARCHAR(255),
  equipment_serial VARCHAR(100),
  estimated_time_minutes INTEGER,
  actual_time_minutes INTEGER,
  estimated_cost DECIMAL(10,2) DEFAULT 0,
  final_cost DECIMAL(10,2) DEFAULT 0,
  labor_cost DECIMAL(10,2) DEFAULT 0,
  parts_cost DECIMAL(10,2) DEFAULT 0,
  scheduled_date TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  warranty_months INTEGER DEFAULT 0,
  customer_notes TEXT,
  internal_notes TEXT,
  signature_url VARCHAR(500),
  tracking_token VARCHAR(100) UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  checklist_progress JSONB DEFAULT '[]',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, order_number)
);

-- ============================================
-- TABLE: service_order_items
-- ============================================
CREATE TABLE IF NOT EXISTS service_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  item_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: service_order_attachments
-- ============================================
CREATE TABLE IF NOT EXISTS service_order_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  file_url VARCHAR(500) NOT NULL,
  file_name VARCHAR(255),
  file_type VARCHAR(20) DEFAULT 'photo' CHECK (file_type IN ('photo', 'document', 'video')),
  file_size INTEGER,
  description VARCHAR(255),
  attachment_phase VARCHAR(20) CHECK (attachment_phase IN ('before', 'after', 'during', 'other')),
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: service_order_history
-- ============================================
CREATE TABLE IF NOT EXISTS service_order_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_by_name VARCHAR(255),
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: appointments
-- ============================================
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_order_id UUID REFERENCES service_orders(id) ON DELETE SET NULL,
  technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title VARCHAR(255),
  scheduled_date TIMESTAMPTZ NOT NULL,
  scheduled_end_date TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled')),
  location_address VARCHAR(500),
  location_latitude DECIMAL(10,8),
  location_longitude DECIMAL(11,8),
  estimated_arrival_time TIMESTAMPTZ,
  actual_arrival_time TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: payments
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_order_id UUID REFERENCES service_orders(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(20) DEFAULT 'dinheiro' CHECK (payment_method IN ('dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'boleto', 'transferencia', 'crediario')),
  payment_status VARCHAR(20) DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded', 'partial')),
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  due_date DATE,
  installments INTEGER DEFAULT 1,
  reference_id VARCHAR(255),
  receipt_url VARCHAR(500),
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: customer_ratings
-- ============================================
CREATE TABLE IF NOT EXISTS customer_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  sentiment VARCHAR(10) DEFAULT 'neutral' CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: technician_routes
-- ============================================
CREATE TABLE IF NOT EXISTS technician_routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  route_date DATE NOT NULL,
  route_sequence JSONB DEFAULT '[]',
  total_distance_km DECIMAL(10,2) DEFAULT 0,
  total_time_minutes INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: notifications
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  type VARCHAR(20) DEFAULT 'push' CHECK (type IN ('sms', 'whatsapp', 'email', 'push')),
  title VARCHAR(255),
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'read')),
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_service_orders_company_id ON service_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON service_orders(status);
CREATE INDEX IF NOT EXISTS idx_service_orders_technician_id ON service_orders(technician_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_customer_id ON service_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_created_at ON service_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_technician_date ON appointments(technician_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appointments_company_id ON appointments(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_company_id ON inventory_items(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_service_order_id ON payments(service_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_company_id ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for API routes)
CREATE POLICY "Service role full access" ON companies FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON customers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON technicians FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON service_types FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON inventory_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON service_orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON service_order_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON service_order_attachments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON service_order_history FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON appointments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON payments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON customer_ratings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON technician_routes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON notifications FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Anon read for public tracking links (service_orders by tracking_token)
CREATE POLICY "Public tracking read" ON service_orders 
  FOR SELECT TO anon USING (tracking_token IS NOT NULL);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_technicians_updated_at BEFORE UPDATE ON technicians FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_types_updated_at BEFORE UPDATE ON service_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_orders_updated_at BEFORE UPDATE ON service_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEQUENCE FOR OS ORDER NUMBERS
-- ============================================
CREATE SEQUENCE IF NOT EXISTS os_number_seq START WITH 1;

-- Function to generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number(company_uuid UUID)
RETURNS VARCHAR AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(order_number, '[^0-9]', '', 'g') AS INTEGER)), 0) + 1
  INTO next_num
  FROM service_orders
  WHERE company_id = company_uuid;
  
  RETURN 'OS-' || LPAD(next_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;
