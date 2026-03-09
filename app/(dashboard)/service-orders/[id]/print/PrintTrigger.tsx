'use client'

import { useEffect } from 'react'

export default function PrintTrigger() {
    useEffect(() => {
        // A slight delay to ensure fonts/images are rendered before the print dialog opens
        const timer = setTimeout(() => {
            window.print()
        }, 500)

        // Close this view if user cancels print (optional UX, usually just leave the tab open)
        // window.onafterprint = () => window.close() 

        return () => clearTimeout(timer)
    }, [])

    return null
}
