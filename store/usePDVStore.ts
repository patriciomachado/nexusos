import { create } from 'zustand'
import { InventoryItem } from '@/types'

interface CartItem {
    id: string
    product: InventoryItem
    quantity: number
    price: number
    total: number
}

interface PDVStore {
    cart: CartItem[]
    addItem: (product: InventoryItem) => void
    removeItem: (id: string) => void
    updateQuantity: (id: string, quantity: number) => void
    clearCart: () => void
    total: number
}

export const usePDVStore = create<PDVStore>((set, get) => ({
    cart: [],
    total: 0,
    addItem: (product) => {
        const { cart } = get()
        const existingItem = cart.find((item) => item.product.id === product.id)

        let newCart
        if (existingItem) {
            newCart = cart.map((item) =>
                item.product.id === product.id
                    ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
                    : item
            )
        } else {
            newCart = [
                ...cart,
                {
                    id: product.id,
                    product,
                    quantity: 1,
                    price: Number(product.selling_price),
                    total: Number(product.selling_price),
                },
            ]
        }

        const total = newCart.reduce((acc, item) => acc + item.total, 0)
        set({ cart: newCart, total })
    },
    removeItem: (id) => {
        const { cart } = get()
        const newCart = cart.filter((item) => item.product.id !== id)
        const total = newCart.reduce((acc, item) => acc + item.total, 0)
        set({ cart: newCart, total })
    },
    updateQuantity: (id, quantity) => {
        const { cart } = get()
        if (quantity <= 0) {
            get().removeItem(id)
            return
        }

        const newCart = cart.map((item) =>
            item.product.id === id ? { ...item, quantity, total: quantity * item.price } : item
        )
        const total = newCart.reduce((acc, item) => acc + item.total, 0)
        set({ cart: newCart, total })
    },
    clearCart: () => set({ cart: [], total: 0 }),
}))
