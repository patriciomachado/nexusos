'use client'

import { use } from 'react'
import { DynamicCatalogContent } from '../../loja/[slug]/page'

export default function LegacyCatalogPage({ params }: { params: Promise<{ slug: string }> }) {
    const resolvedParams = use(params)
    return <DynamicCatalogContent slug={resolvedParams.slug} />
}
