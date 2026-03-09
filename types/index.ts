export type UserRole = 'admin' | 'manager' | 'technician' | 'customer' | 'cashier' | 'attendant'
export type SubscriptionPlan = 'essencial' | 'profissional' | 'avancado'
export type SubscriptionStatus = 'active' | 'inactive' | 'cancelled' | 'trial'
export type OSStatus = 'aberta' | 'agendada' | 'em_andamento' | 'aguardando_pecas' | 'concluida' | 'faturada' | 'cancelada'
export type OSPriority = 'baixa' | 'normal' | 'alta' | 'urgente'
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled'
export type PaymentMethod = 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'boleto' | 'transferencia' | 'crediario'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'partial'
export type NotificationType = 'sms' | 'whatsapp' | 'email' | 'push'
export type InventoryUnit = 'un' | 'kg' | 'm' | 'l' | 'cx' | 'pc' | 'par'
export type CommissionType = 'per_os' | 'per_value' | 'percentage'
export type SentimentType = 'positive' | 'neutral' | 'negative'
export type AttachmentPhase = 'before' | 'after' | 'during' | 'other'

export interface Company {
  id: string
  name: string
  cnpj?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  logo_url?: string
  subscription_plan: SubscriptionPlan
  subscription_status: SubscriptionStatus
  subscription_end_date?: string
  max_users: number
  max_os_per_month: number
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  clerk_id: string
  email: string
  full_name?: string
  phone?: string
  avatar_url?: string
  role: UserRole
  company_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  company_id: string
  name: string
  email?: string
  phone?: string
  cpf_cnpj?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  birth_date?: string
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Technician {
  id: string
  user_id?: string
  company_id: string
  name: string
  email?: string
  phone?: string
  specialties: string[]
  hourly_rate: number
  commission_type: CommissionType
  commission_value: number
  tools_equipment: string[]
  certifications: string[]
  availability_schedule: Record<string, { start: string; end: string; available: boolean }>
  performance_rating: number
  total_os_completed: number
  average_completion_time: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ServiceType {
  id: string
  company_id: string
  name: string
  description?: string
  estimated_time_minutes: number
  base_price: number
  custom_fields: Array<{ name: string; type: string; required: boolean }>
  requires_before_photo: boolean
  requires_after_photo: boolean
  checklist_items: Array<{ id: string; text: string }>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface InventoryItem {
  id: string
  company_id: string
  name: string
  sku?: string
  description?: string
  category?: string
  cost_price: number
  selling_price: number
  quantity_in_stock: number
  minimum_quantity: number
  maximum_quantity: number
  unit: InventoryUnit
  barcode?: string
  serial_number_required: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ServiceOrder {
  id: string
  company_id: string
  order_number: string
  customer_id?: string
  technician_id?: string
  service_type_id?: string
  status: OSStatus
  priority: OSPriority
  title: string
  description?: string
  problem_description?: string
  solution_applied?: string
  equipment_description?: string
  equipment_serial?: string
  estimated_time_minutes?: number
  actual_time_minutes?: number
  estimated_cost: number
  final_cost: number
  labor_cost: number
  parts_cost: number
  scheduled_date?: string
  started_at?: string
  completed_at?: string
  warranty_months: number
  customer_notes?: string
  internal_notes?: string
  signature_url?: string
  tracking_token: string
  checklist_progress: Array<{ id: string; text: string; completed: boolean }>
  created_by?: string
  created_at: string
  updated_at: string
  payment_method_id?: string
  cash_transaction_id?: string
  // Joined
  customer?: Customer
  technician?: Technician
  service_type?: ServiceType
  items?: ServiceOrderItem[]
  attachments?: ServiceOrderAttachment[]
  history?: ServiceOrderHistory[]
  payments?: Payment[]
}

export interface ServiceOrderItem {
  id: string
  service_order_id: string
  inventory_item_id?: string
  item_name: string
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
}

export interface ServiceOrderAttachment {
  id: string
  service_order_id: string
  file_url: string
  file_name?: string
  file_type: 'photo' | 'document' | 'video'
  file_size?: number
  description?: string
  attachment_phase?: AttachmentPhase
  uploaded_by?: string
  created_at: string
}

export interface ServiceOrderHistory {
  id: string
  service_order_id: string
  changed_by?: string
  changed_by_name?: string
  field_name?: string
  old_value?: string
  new_value?: string
  change_reason?: string
  created_at: string
}

export interface Appointment {
  id: string
  service_order_id?: string
  technician_id: string
  customer_id?: string
  company_id: string
  title?: string
  scheduled_date: string
  scheduled_end_date?: string
  status: AppointmentStatus
  location_address?: string
  location_latitude?: number
  location_longitude?: number
  estimated_arrival_time?: string
  actual_arrival_time?: string
  notes?: string
  created_at: string
  updated_at: string
  // Joined
  technician?: Technician
  customer?: Customer
  service_order?: ServiceOrder
}

export interface Payment {
  id: string
  service_order_id?: string
  company_id: string
  customer_id?: string
  amount: number
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  payment_date: string
  due_date?: string
  installments: number
  reference_id?: string
  receipt_url?: string
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
  // Joined
  customer?: Customer
  service_order?: ServiceOrder
}

export interface CustomerRating {
  id: string
  service_order_id: string
  customer_id?: string
  company_id: string
  technician_id?: string
  rating: number
  comment?: string
  sentiment: SentimentType
  created_at: string
}

export interface Notification {
  id: string
  user_id?: string
  company_id?: string
  type: NotificationType
  title?: string
  message: string
  status: 'pending' | 'sent' | 'failed' | 'read'
  sent_at?: string
  read_at?: string
  related_entity_type?: string
  related_entity_id?: string
  created_at: string
}

// Dashboard KPI types
export interface DashboardKPIs {
  total_os_open: number
  total_os_today: number
  total_os_month: number
  revenue_today: number
  revenue_month: number
  technicians_active: number
  avg_rating: number
  pending_payments: number
}

export interface OSStatusCount {
  status: OSStatus
  count: number
}

// Form types
export interface CreateOSForm {
  customer_id: string
  technician_id?: string
  service_type_id?: string
  status: OSStatus
  priority: OSPriority
  title: string
  description?: string
  problem_description?: string
  equipment_description?: string
  equipment_serial?: string
  estimated_time_minutes?: number
  estimated_cost?: number
  scheduled_date?: string
  internal_notes?: string
  warranty_months?: number
}

export interface CreateCustomerForm {
  name: string
  email?: string
  phone?: string
  cpf_cnpj?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  birth_date?: string
  notes?: string
}

export interface CreateTechnicianForm {
  name: string
  email?: string
  phone?: string
  specialties: string[]
  hourly_rate?: number
  commission_type?: CommissionType
  commission_value?: number
}

export interface CreateAppointmentForm {
  service_order_id?: string
  technician_id: string
  customer_id?: string
  title?: string
  scheduled_date: string
  scheduled_end_date?: string
  location_address?: string
  notes?: string
}

export interface RegisterPaymentForm {
  service_order_id?: string
  customer_id?: string
  amount: number
  payment_method: PaymentMethod
  payment_date?: string
  installments?: number
  notes?: string
}

export interface PaymentMethodModel {
  id: string
  name: string
  code: string
  is_active: boolean
  created_at: string
}

export interface TransactionType {
  id: string
  name: string
  code: string
  category: 'entry' | 'exit'
  is_active: boolean
  created_at: string
}

export interface CashRegister {
  id: string
  user_id: string
  opened_at: string
  closed_at?: string
  opening_balance: number
  closing_balance?: number
  status: 'open' | 'closed'
  created_at: string
  // Joined
  user?: User
}

export interface CashTransaction {
  id: string
  cash_register_id: string
  type: 'entry' | 'exit'
  amount: number
  payment_method_id: string
  transaction_type_id?: string
  description?: string
  source_type?: 'service_order' | 'product_sale' | 'manual_sangria' | 'manual_suprimento'
  source_id?: string
  created_at: string
  user_id: string
  justification?: string
  // Joined
  payment_method?: PaymentMethodModel
  transaction_type?: TransactionType
  cash_register?: CashRegister
}

export interface Sale {
  id: string
  company_id: string
  user_id: string
  customer_id?: string
  cash_register_id?: string
  total_amount: number
  discount_amount: number
  final_amount: number
  payment_method_id?: string
  status: 'completed' | 'cancelled'
  notes?: string
  created_at: string
  updated_at: string
  // Joined
  customer?: Customer
  user?: User
  items?: SaleItem[]
  payment_method?: PaymentMethodModel
}

export interface SaleItem {
  id: string
  sale_id: string
  inventory_item_id?: string
  item_name: string
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
  // Joined
  product?: InventoryItem
}

export interface CreateSaleForm {
  customer_id?: string
  cash_register_id: string
  items: Array<{
    inventory_item_id: string
    item_name: string
    quantity: number
    unit_price: number
    total_price: number
  }>
  total_amount: number
  discount_amount: number
  final_amount: number
  payment_method_id: string
  notes?: string
}

