'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { use3dCatalogStore } from '@/lib/store/use3dCatalogStore'

interface ProgressBar3DProps {
    primaryColor?: string
}

export default function ProgressBar3D({ primaryColor = '#00F0FF' }: ProgressBar3DProps) {
    const fillRef = useRef<THREE.Mesh>(null)
    const scrollProgress = use3dCatalogStore((state) => state.scrollProgress)

    useFrame(() => {
        if (fillRef.current) {
            // Smoothly lerp fill scale along X
            const targetScaleX = Math.max(0.01, scrollProgress)
            fillRef.current.scale.x = THREE.MathUtils.lerp(fillRef.current.scale.x, targetScaleX, 0.1)
            // Shift position so it fills left-to-right
            fillRef.current.position.x = -2.5 + (fillRef.current.scale.x * 5) / 2
        }
    })

    return (
        <group position={[0, 2.2, 0]}>
            {/* CONTAINER BACKGROUND TRACK */}
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[5.1, 0.12, 0.08]} />
                <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.8} />
            </mesh>

            {/* DYNAMIC FILL BAR */}
            <mesh ref={fillRef} position={[-2.5, 0, 0.02]}>
                <boxGeometry args={[5, 0.14, 0.1]} />
                <meshStandardMaterial
                    color={primaryColor}
                    emissive={primaryColor}
                    emissiveIntensity={0.8}
                    roughness={0.2}
                />
            </mesh>
        </group>
    )
}
