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
  sku: z.string().optional(),
  barcode: z.string().optional(),
  quantity_in_stock: z.number().int().min(0, 'Quantidade não pode ser negativa'),
  minimum_quantity: z.number().int().min(0).default(0),
  unit_price: z.number().min(0, 'Preço não pode ser negativo'),
  is_active: z.boolean().default(true)
})

// Service Order Schema
export const serviceOrderSchema = z.object({
  customer_id: z.string().uuid('Cliente inválido'),
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  status: z.enum(['open', 'in_progress', 'waiting_parts', 'completed', 'cancelled']).default('open'),
  total_amount: z.number().min(0).default(0),
  payment_status: z.enum(['pending', 'paid', 'partially_paid']).default('pending')
})

// User Schema (Profile Updates)
export const userProfileSchema = z.object({
  name: z.string().min(2, 'Nome muito curto').optional(),
  role: z.enum(['admin', 'technician', 'manager']).optional(),
  is_active: z.boolean().optional()
})
