'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, Text } from '@react-three/drei'
import * as THREE from 'three'
import { use3dCatalogStore } from '@/lib/store/use3dCatalogStore'

interface AchievementBadge3DProps {
    title?: string
    color?: string
}

export default function AchievementBadge3D({
    title = 'MATCH LEGENDÁRIO',
    color = '#10B981',
}: AchievementBadge3DProps) {
    const badgeRef = useRef<THREE.Group>(null)
    const activeSectionIndex = use3dCatalogStore((state) => state.activeSectionIndex)

    useFrame((state, delta) => {
        if (!badgeRef.current) return
        badgeRef.current.rotation.y += delta * 1.2
    })

    // Show badge floating on Section 2 (Progress/Gamification)
    if (activeSectionIndex !== 1) return null

    return (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.8}>
            <group ref={badgeRef} position={[2.2, 1.0, 0]}>
                {/* 3D BADGE OCTAGON SHIELD */}
                <mesh castShadow>
                    <cylinderGeometry args={[0.6, 0.6, 0.1, 8]} />
                    <meshPhysicalMaterial
                        color="#0f172a"
                        metalness={0.9}
                        roughness={0.2}
                        clearcoat={1.0}
                        emissive={color}
                        emissiveIntensity={0.3}
                    />
                </mesh>

                {/* GLOWING BORDER RING */}
                <mesh>
                    <torusGeometry args={[0.62, 0.04, 16, 32]} />
                    <meshStandardMaterial
                        color={color}
                        emissive={color}
                        emissiveIntensity={1.5}
                        toneMapped={false}
                    />
                </mesh>

                {/* TEXT LABEL ON BADGE */}
                <Text
                    position={[0, 0, 0.06]}
                    fontSize={0.12}
                    color="#ffffff"
                    font="/fonts/Inter-Bold.woff"
                    anchorX="center"
                    anchorY="middle"
                >
                    {title}
                </Text>
            </group>
        </Float>
    )
}
