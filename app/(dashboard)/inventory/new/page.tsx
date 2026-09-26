import ProductForm from '@/components/forms/ProductForm'

export default async function NewInventoryItemPage({ searchParams }: { searchParams: Promise<{ barcode?: string }> }) {
    // A code read on the Produtos screen that no product has yet.
    const { barcode } = await searchParams
    return <ProductForm initialData={barcode ? { barcode: barcode.slice(0, 100) } : undefined} />
}
