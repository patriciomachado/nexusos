'use client'

import { useState, useEffect } from 'react'
import DynamicCatalogPage from '../c/[slug]/page'

export default function CatalogRootPage() {
    return <DynamicCatalogPage params={Promise.resolve({ slug: 'default' })} />
}
