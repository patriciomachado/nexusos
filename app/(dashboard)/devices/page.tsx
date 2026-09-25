import { Suspense } from 'react'
import DevicesClient from './DevicesClient'

export default function DevicesPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Carregando…</div>}>
            <DevicesClient />
        </Suspense>
    )
}
