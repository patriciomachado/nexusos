-- Módulo de Caixa (Cash Register)
-- Created at: 2026-03-08

-- Tabela de Meios de Pagamento
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view payment methods.') THEN
        CREATE POLICY "Users can view payment methods." ON payment_methods FOR SELECT USING (TRUE);
    END IF;
END $$;

-- Inserir dados iniciais
INSERT INTO payment_methods (name, code) VALUES 
('Dinheiro', 'CASH'),
('Cartão de Débito', 'DEBIT_CARD'),
('Cartão de Crédito', 'CREDIT_CARD'),
('PIX', 'PIX'),
('Cheque', 'CHEQUE'),
('Crediário', 'INSTALLMENT')
ON CONFLICT (code) DO NOTHING;

-- Tabela de Tipos de Transação
CREATE TABLE IF NOT EXISTS transaction_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL CHECK (category IN ('entry', 'exit')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE transaction_types ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view transaction types.') THEN
        CREATE POLICY "Users can view transaction types." ON transaction_types FOR SELECT USING (TRUE);
    END IF;
END $$;

-- Inserir dados iniciais
INSERT INTO transaction_types (name, code, category) VALUES 
('Venda de Serviço', 'SERVICE_SALE', 'entry'),
('Venda de Produto', 'PRODUCT_SALE', 'entry'),
('Sangria', 'SANGRIA', 'exit'),
('Suprimento', 'SUPRIMENTO', 'entry'),
('Despesa Manual', 'EXPENSE', 'exit'),
('Entrada Manual', 'INCOME', 'entry')
ON CONFLICT (code) DO NOTHING;

-- Tabela de Registros de Caixa
CREATE TABLE IF NOT EXISTS cash_registers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) NOT NULL,
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE,
    opening_balance NUMERIC(15, 2) NOT NULL,
    closing_balance NUMERIC(15, 2),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cash_registers' AND policyname = 'Users can view their own cash registers.') THEN
        CREATE POLICY "Users can view their own cash registers." ON cash_registers FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cash_registers' AND policyname = 'Users can insert their own cash registers.') THEN
        CREATE POLICY "Users can insert their own cash registers." ON cash_registers FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cash_registers' AND policyname = 'Users can update their own cash registers.') THEN
        CREATE POLICY "Users can update their own cash registers." ON cash_registers FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Tabela de Transações de Caixa
CREATE TABLE IF NOT EXISTS cash_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cash_register_id UUID REFERENCES cash_registers(id) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('entry', 'exit')),
    amount NUMERIC(15, 2) NOT NULL,
    payment_method_id UUID REFERENCES payment_methods(id) NOT NULL,
    transaction_type_id UUID REFERENCES transaction_types(id),
    description TEXT,
    source_type TEXT CHECK (source_type IN ('service_order', 'product_sale', 'manual_sangria', 'manual_suprimento')),
    source_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES users(id) NOT NULL,
    justification TEXT
);

ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cash_transactions' AND policyname = 'Users can view their own cash transactions.') THEN
        CREATE POLICY "Users can view their own cash transactions." ON cash_transactions FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cash_transactions' AND policyname = 'Users can insert their own cash transactions.') THEN
        CREATE POLICY "Users can insert their own cash transactions." ON cash_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Adicionar colunas às tabelas existentes de forma segura
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_orders' AND column_name='payment_method_id') THEN
        ALTER TABLE service_orders ADD COLUMN payment_method_id UUID REFERENCES payment_methods(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_orders' AND column_name='cash_transaction_id') THEN
        ALTER TABLE service_orders ADD COLUMN cash_transaction_id UUID REFERENCES cash_transactions(id) UNIQUE;
    END IF;
END $$;

-- Caso a tabela product_sales ainda não exista, isso irá falhar suavemente ou eu criarei depois
-- Verificando existência de product_sales no PRD antes
-- O usuário mencionou integration com product_sales
