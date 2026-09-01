export interface TradeInModelItem {
    id: string
    brand: string
    model: string
    storage: string
    estimated_value: number
    image_url: string
}

export const DEFAULT_TRADE_IN_ITEMS: TradeInModelItem[] = [
    {
        id: 'iphone_17_pro_max',
        brand: 'Apple',
        model: 'iPhone 17 Pro Max',
        storage: '256GB',
        estimated_value: 5800,
        image_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=300&auto=format&fit=crop&q=80'
    },
    {
        id: 'iphone_17_pro',
        brand: 'Apple',
        model: 'iPhone 17 Pro',
        storage: '256GB',
        estimated_value: 5500,
        image_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=300&auto=format&fit=crop&q=80'
    },
    {
        id: 'iphone_17_normal',
        brand: 'Apple',
        model: 'iPhone 17',
        storage: '128GB',
        estimated_value: 3700,
        image_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=300&auto=format&fit=crop&q=80'
    },
    {
        id: 'iphone_16_pro_max',
        brand: 'Apple',
        model: 'iPhone 16 Pro Max',
        storage: '256GB',
        estimated_value: 4300,
        image_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=300&auto=format&fit=crop&q=80'
    },
    {
        id: 'iphone_16_pro_256',
        brand: 'Apple',
        model: 'iPhone 16 Pro',
        storage: '256GB',
        estimated_value: 3800,
        image_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=300&auto=format&fit=crop&q=80'
    },
    {
        id: 'iphone_16_pro_128',
        brand: 'Apple',
        model: 'iPhone 16 Pro',
        storage: '128GB',
        estimated_value: 3500,
        image_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=300&auto=format&fit=crop&q=80'
    },
    {
        id: 'iphone_16_normal',
        brand: 'Apple',
        model: 'iPhone 16',
        storage: '128GB',
        estimated_value: 3000,
        image_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=300&auto=format&fit=crop&q=80'
    },
    {
        id: 'iphone_15_pro_max',
        brand: 'Apple',
        model: 'iPhone 15 Pro Max',
        storage: '256GB',
        estimated_value: 3300,
        image_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=300&auto=format&fit=crop&q=80'
    },
    {
        id: 'iphone_15_pro',
        brand: 'Apple',
        model: 'iPhone 15 Pro',
        storage: '128GB',
        estimated_value: 3000,
        image_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=300&auto=format&fit=crop&q=80'
    },
    {
        id: 'iphone_15_normal',
        brand: 'Apple',
        model: 'iPhone 15',
        storage: '128GB',
        estimated_value: 2000,
        image_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=300&auto=format&fit=crop&q=80'
    },
    {
        id: 'iphone_14_pro_max',
        brand: 'Apple',
        model: 'iPhone 14 Pro Max',
        storage: '128GB',
        estimated_value: 2300,
        image_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=300&auto=format&fit=crop&q=80'
    },
    {
        id: 'iphone_14_pro',
        brand: 'Apple',
        model: 'iPhone 14 Pro',
        storage: '128GB',
        estimated_value: 2000,
        image_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=300&auto=format&fit=crop&q=80'
    },
    {
        id: 'iphone_14_normal',
        brand: 'Apple',
        model: 'iPhone 14',
        storage: '128GB',
        estimated_value: 1500,
        image_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=300&auto=format&fit=crop&q=80'
    },
    {
        id: 'iphone_13_pro_max',
        brand: 'Apple',
        model: 'iPhone 13 Pro Max',
        storage: '128GB',
        estimated_value: 2000,
        image_url: 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=300&auto=format&fit=crop&q=80'
    },
    {
        id: 'iphone_13_pro',
        brand: 'Apple',
        model: 'iPhone 13 Pro',
        storage: '128GB',
        estimated_value: 1600,
        image_url: 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=300&auto=format&fit=crop&q=80'
    },
    {
        id: 'iphone_13_normal',
        brand: 'Apple',
        model: 'iPhone 13',
        storage: '128GB',
        estimated_value: 1100,
        image_url: 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=300&auto=format&fit=crop&q=80'
    },
    {
        id: 'iphone_12_pro_max',
        brand: 'Apple',
        model: 'iPhone 12 Pro Max',
        storage: '128GB',
        estimated_value: 1500,
        image_url: 'https://images.unsplash.com/photo-1603891128711-11b4b0320d56?w=300&auto=format&fit=crop&q=80'
    },
    {
        id: 'iphone_12_pro',
        brand: 'Apple',
        model: 'iPhone 12 Pro',
        storage: '128GB',
        estimated_value: 1200,
        image_url: 'https://images.unsplash.com/photo-1603891128711-11b4b0320d56?w=300&auto=format&fit=crop&q=80'
    },
    {
        id: 'iphone_12_normal',
        brand: 'Apple',
        model: 'iPhone 12',
        storage: '64GB',
        estimated_value: 900,
        image_url: 'https://images.unsplash.com/photo-1603891128711-11b4b0320d56?w=300&auto=format&fit=crop&q=80'
    },
    {
        id: 'iphone_11_pro_max_64',
        brand: 'Apple',
        model: 'iPhone 11 Pro Max',
        storage: '64GB',
        estimated_value: 700,
        image_url: 'https://images.unsplash.com/photo-1574944985070-8f30c1f97067?w=300&auto=format&fit=crop&q=80'
    },
    {
        id: 'iphone_11_pro_64',
        brand: 'Apple',
        model: 'iPhone 11 Pro',
        storage: '64GB',
        estimated_value: 700,
        image_url: 'https://images.unsplash.com/photo-1574944985070-8f30c1f97067?w=300&auto=format&fit=crop&q=80'
    },
    {
        id: 'iphone_11_64',
        brand: 'Apple',
        model: 'iPhone 11',
        storage: '64GB',
        estimated_value: 400,
        image_url: 'https://images.unsplash.com/photo-1574944985070-8f30c1f97067?w=300&auto=format&fit=crop&q=80'
    }
]
