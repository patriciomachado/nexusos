-- CORREÇÃO DO MÓDULO DE CAIXA
-- Redirecionando chaves estrangeiras de auth.users para public.users

-- 1. Remover chaves estrangeiras erradas da tabela cash_registers
ALTER TABLE cash_registers DROP CONSTRAINT IF EXISTS cash_registers_user_id_fkey;

-- 2. Adicionar a chave estrangeira correta para public.users
ALTER TABLE cash_registers 
ADD CONSTRAINT cash_registers_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id);

-- 3. Caso tenha criado cash_transactions com a mesma referência errada
ALTER TABLE cash_transactions DROP CONSTRAINT IF EXISTS cash_transactions_user_id_fkey;

ALTER TABLE cash_transactions 
ADD CONSTRAINT cash_transactions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id);

-- 4. Garantir que as colunas de OS também apontem para os lugares certos se necessário
-- (payment_methods já foi verificado e está ok)
