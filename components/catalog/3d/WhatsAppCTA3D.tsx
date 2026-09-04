'use client'

import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Text } from '@react-three/drei'
import * as THREE from 'three'

import { use3dCatalogStore } from '@/lib/store/use3dCatalogStore'

interface WhatsAppCTA3DProps {
    companyName?: string
    companyPhone?: string
    modelName?: string
    price?: number
}

export default function WhatsAppCTA3D({
    companyName = 'Nexus Store',
    companyPhone = '',
    modelName = 'iPhone',
    price = 0,
}: WhatsAppCTA3DProps) {
    const buttonRef = useRef<THREE.Group>(null)
    const [hovered, setHovered] = useState(false)
    const activeSectionIndex = use3dCatalogStore((state) => state.activeSectionIndex)

    useFrame((state, delta) => {
        if (!buttonRef.current) return

        // Scale up smoothly on hover
        const targetScale = hovered ? 1.15 : 1.0
        buttonRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 8)
        buttonRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 2.0) * 0.08
    })

    const handleClick = () => {
        const cleanPhone = companyPhone.replace(/\D/g, '')
        const text = `Olá ${companyName}! Quero resgatar meu *${modelName}* (${price > 0 ? `R$ ${price}` : ''}) pelo WhatsApp agora!`
        window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank')
    }

    if (activeSectionIndex !== 4) return null

    return (
        <group
            ref={buttonRef}
            position={[0, -0.2, 1.2]}
            onClick={handleClick}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
        >
            {/* PHYSICAL 3D BUTTON CHASSIS */}
            <RoundedBox args={[3.2, 0.8, 0.2]} radius={0.15} smoothness={8}>
                <meshPhysicalMaterial
                    color={hovered ? '#34D399' : '#10B981'}
                    emissive="#10B981"
                    emissiveIntensity={hovered ? 0.9 : 0.5}
                    metalness={0.8}
                    roughness={0.2}
                    clearcoat={1.0}
                />
            </RoundedBox>

            {/* NEON BORDER GLOW RING */}
            <RoundedBox args={[3.26, 0.86, 0.18]} radius={0.16} smoothness={8}>
                <meshStandardMaterial
                    color="#34D399"
                    emissive="#34D399"
                    emissiveIntensity={1.5}
                    transparent
                    opacity={0.3}
                />
            </RoundedBox>

            {/* 3D TEXT INSIDE BUTTON */}
            <Text
                position={[0, 0, 0.12]}
                fontSize={0.18}
                color="#000000"
                font="/fonts/Inter-Bold.woff"
                anchorX="center"
                anchorY="middle"
            >
                RESGATAR NO WHATSAPP AGORA ➔
            </Text>
        </group>
    )
}
