export interface TechnicalPassport {
    is_revised?: boolean
    revision_date?: string
    replaced_parts?: string[]
    warranty_months?: number
    bench_technician_notes?: string
}

export interface Device {
    id: string
    company_id: string
    user_id?: string | null
    brand: string
    model: string
    storage?: string | null
    color?: string | null
    condition: 'novo_lacrado' | 'seminovo_a' | 'seminovo_b' | 'recondicionado'
    battery_health?: number | null
    imei_1?: string | null
    imei_2?: string | null
    serial_number?: string | null
    cost_price: number
    cash_price: number
    installment_price?: number | null
    status: 'disponivel' | 'vendido' | 'reservado' | 'em_revisao'
    included_items?: string[]
    images?: string[]
    technical_passport?: TechnicalPassport
    notes?: string | null
    created_at?: string
    updated_at?: string
}

export interface CatalogSettings {
    id: string
    company_id: string
    slug: string
    catalog_title: string
    banner_url?: string | null
    whatsapp_number?: string | null
    motoboy_delivery_fee?: number
    is_active: boolean
    created_at?: string
    updated_at?: string
}

export interface TradeInChecklist {
    screen_ok?: boolean
    touch_ok?: boolean
    battery_health?: number
    cameras_ok?: boolean
    face_id_ok?: boolean
    housing_condition?: 'impecavel' | 'bom' | 'marcas_leves' | 'danificado'
    audio_mic_ok?: boolean
    charging_port_ok?: boolean
    estimated_repair_cost?: number
}

export interface DeviceTradeIn {
    id: string
    company_id: string
    user_id?: string | null
    customer_name: string
    customer_cpf?: string | null
    customer_phone?: string | null
    device_model: string
    imei?: string | null
    assessment_checklist?: TradeInChecklist
    offered_price: number
    status: 'avaliado' | 'comprado' | 'recusado'
    notes?: string | null
    created_at?: string
}
