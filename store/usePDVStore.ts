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
    discount: number
    taxRate: number
    addItem: (product: InventoryItem) => void
    removeItem: (id: string) => void
    updateQuantity: (id: string, quantity: number) => void
    updatePrice: (id: string, price: number) => void
    setDiscount: (amount: number) => void
    setSearchQuery: (query: string) => void
    clearCart: () => void
    searchQuery: string
    subtotal: number
    taxAmount: number
    total: number
    isFinishModalOpen: boolean
    setIsFinishModalOpen: (open: boolean) => void
}

export const usePDVStore = create<PDVStore>((set, get) => ({
    cart: [],
    discount: 0,
    taxRate: 0.1177, // Example tax rate based on screenshot (approx 48.25 / 409.90)
    subtotal: 0,
    taxAmount: 0,
    total: 0,
    searchQuery: '',
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

        const subtotal = newCart.reduce((acc, item) => acc + item.total, 0)
        const taxAmount = subtotal * get().taxRate
        const total = subtotal + taxAmount - get().discount
        set({ cart: newCart, subtotal, taxAmount, total })
    },
    removeItem: (id) => {
        const { cart } = get()
        const newCart = cart.filter((item) => item.product.id !== id)
        const subtotal = newCart.reduce((acc, item) => acc + item.total, 0)
        const taxAmount = subtotal * get().taxRate
        const total = subtotal + taxAmount - get().discount
        set({ cart: newCart, subtotal, taxAmount, total })
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
        const subtotal = newCart.reduce((acc, item) => acc + item.total, 0)
        const taxAmount = subtotal * get().taxRate
        const total = subtotal + taxAmount - get().discount
        set({ cart: newCart, subtotal, taxAmount, total })
    },
    updatePrice: (id, price) => {
        const { cart } = get()
        const newCart = cart.map((item) =>
            item.product.id === id ? { ...item, price, total: item.quantity * price } : item
        )
        const subtotal = newCart.reduce((acc, item) => acc + item.total, 0)
        const taxAmount = subtotal * get().taxRate
        const total = subtotal + taxAmount - get().discount
        set({ cart: newCart, subtotal, taxAmount, total })
    },
    setDiscount: (amount) => {
        const subtotal = get().subtotal
        const taxAmount = get().taxAmount
        const total = subtotal + taxAmount - amount
        set({ discount: amount, total })
    },
    setSearchQuery: (query) => set({ searchQuery: query }),
    isFinishModalOpen: false,
    setIsFinishModalOpen: (open) => set({ isFinishModalOpen: open }),
    clearCart: () => set({ cart: [], subtotal: 0, taxAmount: 0, total: 0, discount: 0, searchQuery: '', isFinishModalOpen: false }),
}))
