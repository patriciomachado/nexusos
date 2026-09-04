'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, Text } from '@react-three/drei'
import * as THREE from 'three'

import { use3dCatalogStore } from '@/lib/store/use3dCatalogStore'
import { formatCurrency } from '@/lib/utils'

interface PriceBreakdown3DProps {
    tablePrice?: number
    tradeInDiscount?: number
    cashPrice: number
    rate12x?: number
    rate24x?: number
}

export default function PriceBreakdown3D({
    tablePrice = 6500,
    tradeInDiscount = 1200,
    cashPrice = 5300,
    rate12x = 10,
    rate24x = 18,
}: PriceBreakdown3DProps) {
    const groupRef = useRef<THREE.Group>(null)
    const activeSectionIndex = use3dCatalogStore((state) => state.activeSectionIndex)

    const installment12 = (cashPrice * (1 + rate12x / 100)) / 12
    const installment24 = (cashPrice * (1 + rate24x / 100)) / 24

    useFrame((state, delta) => {
        if (!groupRef.current) return
        groupRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.1
    })

    if (activeSectionIndex !== 3) return null

    return (
        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
            <group ref={groupRef} position={[0, 0.2, 0.5]}>
                {/* BACKDROP HUD PLATE */}
                <mesh position={[0, 0, -0.1]}>
                    <planeGeometry args={[4.2, 2.8]} />
                    <meshPhysicalMaterial
                        color="#030712"
                        roughness={0.2}
                        metalness={0.8}
                        transparent
                        opacity={0.85}
                        clearcoat={1.0}
                    />
                </mesh>

                {/* TABLE PRICE (CRUMBLED LINE-THROUGH) */}
                <Text
                    position={[0, 0.9, 0]}
                    fontSize={0.16}
                    color="#64748B"
                    anchorX="center"
                >
                    De: {formatCurrency(tablePrice)}
                </Text>

                {/* TRADE-IN ABATEMENT BADGE */}
                <Text
                    position={[0, 0.65, 0]}
                    fontSize={0.14}
                    color="#00F0FF"
                    anchorX="center"
                >
                    ⚡ Abate de Troca: -{formatCurrency(tradeInDiscount)}
                </Text>

                {/* GIGANTIC PIX CASH PRICE */}
                <Text
                    position={[0, 0.2, 0]}
                    fontSize={0.45}
                    color="#10B981"
                    font="/fonts/Inter-Bold.woff"
                    anchorX="center"
                >
                    {formatCurrency(cashPrice)}
                </Text>

                <Text
                    position={[0, -0.15, 0]}
                    fontSize={0.12}
                    color="#94A3B8"
                    anchorX="center"
                >
                    À VISTA NO PIX (DESCONTO MÁXIMO)
                </Text>

                {/* 12X & 24X CARDS */}
                <group position={[-0.9, -0.6, 0]}>
                    <mesh>
                        <planeGeometry args={[1.5, 0.5]} />
                        <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.7} />
                    </mesh>
                    <Text position={[0, 0.08, 0.01]} fontSize={0.1} color="#94A3B8" anchorX="center">
                        12x NO CARTÃO
                    </Text>
                    <Text position={[0, -0.08, 0.01]} fontSize={0.12} color="#38BDF8" anchorX="center">
                        12x {formatCurrency(installment12)}
                    </Text>
                </group>

                <group position={[0.9, -0.6, 0]}>
                    <mesh>
                        <planeGeometry args={[1.5, 0.5]} />
                        <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.7} />
                    </mesh>
                    <Text position={[0, 0.08, 0.01]} fontSize={0.1} color="#94A3B8" anchorX="center">
                        24x NO CARTÃO
                    </Text>
                    <Text position={[0, -0.08, 0.01]} fontSize={0.12} color="#FCD34D" anchorX="center">
                        24x {formatCurrency(installment24)}
                    </Text>
                </group>
            </group>
        </Float>
    )
}
