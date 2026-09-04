'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface HudGridEnvironmentProps {
    primaryColor?: string
    accentColor?: string
}

export default function HudGridEnvironment({
    primaryColor = '#00F0FF',
    accentColor = '#10B981',
}: HudGridEnvironmentProps) {
    const gridRef = useRef<THREE.GridHelper>(null)
    const pointsRef = useRef<THREE.Points>(null)

    // Generate floating ambient particles
    const particleCount = 120
    const positions = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 20
        positions[i * 3 + 1] = (Math.random() - 0.5) * 20
        positions[i * 3 + 2] = (Math.random() - 0.5) * 20
    }

    useFrame((state, delta) => {
        if (gridRef.current) {
            gridRef.current.position.z = (state.clock.getElapsedTime() * 0.8) % 2
        }
        if (pointsRef.current) {
            pointsRef.current.rotation.y = state.clock.getElapsedTime() * 0.03
        }
    })

    return (
        <group>
            {/* AMBIENT LIGHTS */}
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 8, 5]} intensity={1.5} color="#ffffff" castShadow />
            <pointLight position={[-4, 2, -2]} intensity={3} color={primaryColor} distance={10} />
            <pointLight position={[4, -2, 2]} intensity={2.5} color={accentColor} distance={10} />

            {/* CYBER HUD FLOOR GRID */}
            <gridHelper
                ref={gridRef}
                args={[30, 30, primaryColor, '#1e293b']}
                position={[0, -2.5, 0]}
            />

            {/* CYBER HUD CEILING GRID */}
            <gridHelper
                args={[30, 30, primaryColor, '#0f172a']}
                position={[0, 4.5, 0]}
                rotation={[Math.PI, 0, 0]}
            />

            {/* FLOATING HUD PARTICLES */}
            <points ref={pointsRef}>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        args={[positions, 3]}
                    />
                </bufferGeometry>
                <pointsMaterial
                    size={0.06}
                    color={primaryColor}
                    transparent
                    opacity={0.6}
                    blending={THREE.AdditiveBlending}
                />
            </points>
        </group>
    )
}
