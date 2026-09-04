'use client'

import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { use3dCatalogStore } from '@/lib/store/use3dCatalogStore'

export default function PostProcessingPipeline() {
    const performanceTier = use3dCatalogStore((state) => state.performanceTier)

    // Skip heavy postprocessing on low tier devices
    if (performanceTier === 'low') return null

    return (
        <EffectComposer multisampling={performanceTier === 'high' ? 8 : 0}>
            {/* CINEMATIC NEON BLOOM */}
            <Bloom
                intensity={1.2}
                luminanceThreshold={0.25}
                luminanceSmoothing={0.8}
                mipmapBlur
            />

            {/* SUBTLE SCI-FI CHROMATIC ABERRATION */}
            <ChromaticAberration
                offset={new THREE.Vector2(0.0015, 0.0015)}
                radialModulation={false}
                modulationOffset={0.0}
            />

            {/* DARK VIGNETTE FOCUS */}
            <Vignette
                eskil={false}
                offset={0.35}
                darkness={0.75}
            />
        </EffectComposer>
    )
}
