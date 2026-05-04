import { z } from 'zod'

// Generic ID validation
export const idSchema = z.string().uuid('ID inválido')

// Appointment Schema
export const appointmentSchema = z.object({
  customer_id: z.string().uuid('Cliente inválido'),
  technician_id: z.string().uuid('Técnico inválido'),
  scheduled_date: z.string().datetime({ message: 'Data e hora inválidas' }),
  notes: z.string().optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).default('scheduled'),
  service_order_id: z.string().uuid('Ordem de serviço inválida').optional()
})

// Customer Schema
export const customerSchema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  document: z.string().optional(),
  is_active: z.boolean().default(true)
})

// Inventory Item Schema
export const inventoryItemSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  sku: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  cost_price: z.number().min(0).optional().default(0),
  selling_price: z.number().min(0).optional().default(0),
  quantity_in_stock: z.number().default(0),
  minimum_quantity: z.number().min(0).default(0),
  maximum_quantity: z.number().min(0).default(999),
  unit: z.string().default('un'),
  barcode: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
  serial_number_required: z.boolean().optional().default(false),
  is_active: z.boolean().default(true)
})


// Service Order Schema
export const serviceOrderSchema = z.object({
  customer_id: z.string().uuid('Cliente inválido').nullable().optional(),
  technician_id: z.string().uuid('Técnico inválido').nullable().optional(),
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional().nullable(),
  problem_description: z.string().optional().nullable(),
  equipment_description: z.string().optional().nullable(),
  equipment_serial: z.string().optional().nullable(),
  status: z.string().optional().default('aberta'),
  priority: z.string().optional().default('normal'),
  estimated_time_minutes: z.number().int().optional().nullable(),
  estimated_cost: z.number().min(0).optional().default(0),
  parts_cost: z.number().min(0).optional().default(0),
  labor_cost: z.number().min(0).optional().default(0),
  scheduled_date: z.string().optional().nullable(),
  internal_notes: z.string().optional().nullable(),
  warranty_months: z.number().int().min(0).optional().default(0),
  device_condition: z.string().optional().nullable(),
  turns_on: z.boolean().optional().default(true),
  discount_amount: z.number().min(0).optional().default(0),
  photo_front_url: z.string().optional().nullable(),
  photo_back_url: z.string().optional().nullable(),
  items: z.array(z.object({
    inventory_item_id: z.string().uuid().nullable().optional(),
    item_name: z.string(),
    quantity: z.number().min(1),
    unit_price: z.number().min(0),
    total_price: z.number().min(0),
    unit_cost: z.number().min(0).optional().default(0),
    total_cost: z.number().min(0).optional().default(0),
  })).optional(),
})

// Cash Transaction Schema
export const cashTransactionSchema = z.object({
  cash_register_id: z.string().uuid('Caixa inválido'),
  type: z.enum(['entry', 'exit']),
  amount: z.number().positive('Valor deve ser positivo'),
  payment_method_id: z.string().uuid('Método de pagamento inválido'),
  transaction_type_id: z.string().uuid('Tipo de transação inválido').optional().nullable(),
  description: z.string().optional().nullable(),
  source_type: z.string().optional().nullable(),
  source_id: z.string().uuid().optional().nullable(),
  justification: z.string().optional().nullable(),
})

// Sale Schema
export const saleSchema = z.object({
  customer_id: z.string().uuid('Cliente inválido').nullable().optional(),
  cash_register_id: z.string().uuid('Caixa inválido').optional(),
  total_amount: z.number().min(0),
  discount_amount: z.number().min(0).default(0),
  final_amount: z.number().min(0).optional(),
  payment_method_id: z.string().uuid('Método de pagamento inválido').optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(z.object({
    inventory_item_id: z.string().uuid('Item de estoque inválido'),
    item_name: z.string(),
    quantity: z.number().min(1),
    unit_price: z.number().min(0),
    total_price: z.number().min(0),
  }))
})

// Payment Schema
export const paymentSchema = z.object({
  customer_id: z.string().uuid('Cliente inválido').nullable().optional(),
  service_order_id: z.string().uuid('Ordem de serviço inválida').nullable().optional(),
  sale_id: z.string().uuid('Venda inválida').nullable().optional(),
  amount: z.number().positive('Valor deve ser positivo'),
  payment_method: z.string().min(1, 'Método de pagamento é obrigatório'),
  payment_status: z.enum(['pending', 'completed', 'cancelled']).default('completed'),
  payment_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

// Technician Schema
export const technicianSchema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('E-mail inválido').optional().nullable(),
  phone: z.string().optional().nullable(),
  specialty: z.string().optional().nullable(),
})

// User Schema (Creation)
export const createUserSchema = z.object({
  email: z.string().email('E-mail inválido'),
  full_name: z.string().min(2, 'Nome muito curto'),
  role: z.enum(['admin', 'manager', 'technician', 'cashier', 'attendant', 'talento', 'customer']),
  phone: z.string().optional().nullable(),
  clerk_id: z.string().optional().nullable(),
})

// Cash Register Schema (Opening)
export const cashRegisterOpenSchema = z.object({
  opening_balance: z.number().min(0, 'Saldo inicial não pode ser negativo'),
})

// Company Schema
export const companyUpdateSchema = z.object({
  name: z.string().min(2, 'Nome muito curto').optional(),
  cnpj: z.string().optional().nullable(),
  email: z.string().email('E-mail inválido').optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip_code: z.string().optional().nullable(),
  logo_url: z.string().url().optional().nullable(),
  warranty_terms: z.string().optional().nullable(),
  cash_cycle: z.enum(['daily', 'monthly']).optional(),
  auto_close_cash: z.boolean().optional(),
  settings: z.record(z.string(), z.any()).optional(),
})

// Service Type Schema
export const serviceTypeSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional().nullable(),
  base_price: z.number().min(0).default(0),
  is_active: z.boolean().default(true).optional(),
})

// Payment Method Schema
export const paymentMethodSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  code: z.string().optional().nullable(),
  is_active: z.boolean().default(true).optional(),
})

// Inventory Adjustment Schema
export const inventoryAdjustSchema = z.object({
  quantity: z.number().describe('Quantidade a ser adicionada ou removida'),
})

// OS Status Update Schema
export const osStatusUpdateSchema = z.object({
  status: z.string().min(1, 'Status é obrigatório'),
  reason: z.string().optional().nullable(),
  solution_applied: z.string().optional().nullable(),
  payment_method_id: z.string().uuid().optional().nullable(),
})

// Category Schema
export const categorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
})

// Recurring Expense Schema
export const recurringExpenseSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.number().min(0, 'Valor não pode ser negativo'),
  day_of_month: z.number().int().min(1).max(31, 'Dia inválido'),
  transaction_type_id: z.string().uuid('Tipo de transação inválido').nullable().optional(),
  payment_method_id: z.string().uuid('Método de pagamento inválido').nullable().optional(),
  is_active: z.boolean().default(true),
})


