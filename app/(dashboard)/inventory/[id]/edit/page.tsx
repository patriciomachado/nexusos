'use client'

import { useEffect, useState, use } from 'react'
import ProductForm from '@/components/forms/ProductForm'

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [product, setProduct] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch(`/api/inventory?id=${id}`) // Assuming the API can fetch by ID or I can just use the GET with filter
            .then(res => res.json())
            .then(data => {
                // If the API returns multiple, find the one
                const item = Array.isArray(data) ? data.find((i: any) => i.id === id) : data
                setProduct(item)
                setLoading(false)
            })
    }, [id])

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
    )

    return <ProductForm productId={id} initialData={product} />
}
