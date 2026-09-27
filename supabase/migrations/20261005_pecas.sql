-- =============================================================================
-- Peças e componentes: estoque de peças, baixa pela OS, compras, fornecedores,
-- defeitos e tabela de preços por aparelho.
-- Idempotente: pode rodar mais de uma vez.
-- =============================================================================

-- Fornecedores.
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(160) NOT NULL,
    phone VARCHAR(40),
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_suppliers_company ON suppliers(company_id);
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Peças ficam no mesmo estoque dos produtos, marcadas como 'peca'.
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS kind VARCHAR(20) NOT NULL DEFAULT 'produto';
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS device_model VARCHAR(120);
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS part_quality VARCHAR(40);
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS location VARCHAR(80);
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_items_kind_check') THEN
        ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_kind_check CHECK (kind IN ('produto', 'peca'));
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_inventory_items_kind ON inventory_items(company_id, kind);

-- Histórico de preço por fornecedor (cotações e compras).
CREATE TABLE IF NOT EXISTS supplier_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    source VARCHAR(20) NOT NULL DEFAULT 'cotacao',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supplier_prices_item ON supplier_prices(inventory_item_id, created_at DESC);
ALTER TABLE supplier_prices ENABLE ROW LEVEL SECURITY;

-- Toda entrada e saída de estoque (OS, compra, ajuste, defeito, venda).
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    quantity NUMERIC(12,3) NOT NULL,
    reason VARCHAR(20) NOT NULL,
    source_type VARCHAR(30),
    source_id UUID,
    unit_cost NUMERIC(12,2),
    notes TEXT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(inventory_item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_source ON stock_movements(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_company ON stock_movements(company_id, created_at DESC);
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- OS criadas a partir de agora baixam peças do estoque; as antigas não, para
-- não descontar de novo o que já foi usado.
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS stock_tracked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE service_orders ALTER COLUMN stock_tracked SET DEFAULT true;

-- Pedidos de compra de peças.
CREATE TABLE IF NOT EXISTS part_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'enviado', 'recebido', 'cancelado')),
    notes TEXT,
    total NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_part_orders_company ON part_orders(company_id, created_at DESC);
ALTER TABLE part_orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS part_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES part_orders(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
    unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    service_order_id UUID REFERENCES service_orders(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_part_order_items_order ON part_order_items(order_id);
ALTER TABLE part_order_items ENABLE ROW LEVEL SECURITY;

-- Peças que deram defeito (garantia do fornecedor).
CREATE TABLE IF NOT EXISTS part_defects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    service_order_id UUID REFERENCES service_orders(id) ON DELETE SET NULL,
    quantity NUMERIC(12,3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    reason TEXT,
    resolution VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (resolution IN ('pendente', 'trocada', 'devolvida', 'prejuizo')),
    cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_part_defects_company ON part_defects(company_id, created_at DESC);
ALTER TABLE part_defects ENABLE ROW LEVEL SECURITY;

-- Tabela de preços por aparelho e serviço.
CREATE TABLE IF NOT EXISTS repair_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    device_model VARCHAR(120) NOT NULL,
    service VARCHAR(120) NOT NULL,
    part_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
    labor_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    price NUMERIC(12,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_repair_prices_company ON repair_prices(company_id, device_model);
ALTER TABLE repair_prices ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
