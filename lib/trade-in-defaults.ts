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
        id: 'iphone_8_64',
        brand: 'Apple',
        model: 'iPhone 8',
        storage: '64GB',
        estimated_value: 500,
        image_url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&auto=format&fit=crop&q=80'
    },
    {
        id: 'iphone_x_64',
        brand: 'Apple',
        model: 'iPhone X',
        storage: '64GB',
        estimated_value: 800,
        image_url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=300&auto=format&fit=crop&q=80'
    },
    {
        id: 'iphone_xr_64',
        brand: 'Apple',
        model: 'iPhone XR',
        storage: '64GB',
        estimated_value: 950,
        image_url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=300&auto=format&fit=crop&q=80'
    },
    {
        id: 'iphone_11_64',
        brand: 'Apple',
        model: 'iPhone 11',
        storage: '64GB',
        estimated_value: 1250,
        image_url: 'https://images.unsplash.com/photo-1574944985070-8f30c1f97067?w=300&auto=format&fit=crop&q=80'
    },
    {
        id: 'iphone_11_128',
        brand: 'Apple',
        model: 'iPhone 11',
        storage: '128GB',
        estimated_value: 1450,
        image_url: 'https://images.unsplash.com/photo-1574944985070-8f30c1f97067?w=300&auto=format&fit=crop&q=80'
    },
    {
        id: 'iphone_12_64',
        brand: 'Apple',
        model: 'iPhone 12',
        storage: '64GB',
        estimated_value: 1750,
        image_url: 'https://images.unsplash.com/photo-1603891128711-11b4b0320d56?w=300&auto=format&fit=crop&q=80'
    },
    {
        id: 'iphone_12_128',
        brand: 'Apple',
        model: 'iPhone 12',
        storage: '128GB',
        estimated_value: 1950,
        image_url: 'https://images.unsplash.com/photo-1603891128711-11b4b0320d56?w=300&auto=format&fit=crop&q=80'
    },
    {
        id: 'iphone_13_128',
        brand: 'Apple',
        model: 'iPhone 13',
        storage: '128GB',
        estimated_value: 2600,
        image_url: 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=300&auto=format&fit=crop&q=80'
    },
    {
        id: 'iphone_13_pro_128',
        brand: 'Apple',
        model: 'iPhone 13 Pro',
        storage: '128GB',
        estimated_value: 3300,
        image_url: 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=300&auto=format&fit=crop&q=80'
    },
    {
        id: 'iphone_14_128',
        brand: 'Apple',
        model: 'iPhone 14',
        storage: '128GB',
        estimated_value: 3400,
        image_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=300&auto=format&fit=crop&q=80'
    },
    {
        id: 'iphone_14_pro_128',
        brand: 'Apple',
        model: 'iPhone 14 Pro',
        storage: '128GB',
        estimated_value: 4200,
        image_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=300&auto=format&fit=crop&q=80'
    },
    {
        id: 'iphone_15_128',
        brand: 'Apple',
        model: 'iPhone 15',
        storage: '128GB',
        estimated_value: 4300,
        image_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=300&auto=format&fit=crop&q=80'
    }
]
