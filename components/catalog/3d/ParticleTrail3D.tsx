'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { use3dCatalogStore } from '@/lib/store/use3dCatalogStore'

interface ParticleTrail3DProps {
    color?: string
}

export default function ParticleTrail3D({ color = '#00F0FF' }: ParticleTrail3DProps) {
    const pointsRef = useRef<THREE.Points>(null)
    const scrollProgress = use3dCatalogStore((state) => state.scrollProgress)

    const particleCount = 60
    const [positions, scales] = useMemo(() => {
        const pos = new Float32Array(particleCount * 3)
        const sca = new Float32Array(particleCount)
        for (let i = 0; i < particleCount; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 0.4
            pos[i * 3 + 1] = (Math.random() - 0.5) * 0.1
            pos[i * 3 + 2] = (Math.random() - 0.5) * 0.1
            sca[i] = Math.random()
        }
        return [pos, sca]
    }, [particleCount])

    useFrame((state) => {
        if (!pointsRef.current) return
        
        // Position particle cluster right at the leading edge of the progress bar
        const leadingX = -2.5 + scrollProgress * 5.0
        pointsRef.current.position.x = leadingX
        pointsRef.current.position.y = 2.2
        pointsRef.current.position.z = 0.05

        // Animate slight jitter
        const time = state.clock.getElapsedTime()
        const posAttr = pointsRef.current.geometry.attributes.position
        for (let i = 0; i < particleCount; i++) {
            posAttr.setY(i, Math.sin(time * 5 + i) * 0.08)
        }
        posAttr.needsUpdate = true
    })

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    args={[positions, 3]}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.07}
                color={color}
                transparent
                opacity={0.9}
                blending={THREE.AdditiveBlending}
            />
        </points>
    )
}
