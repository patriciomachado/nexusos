'use client'

import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

import { use3dCatalogStore } from '@/lib/store/use3dCatalogStore'
import { HologramMaterial } from './HologramShaderMaterial'

interface StylizedSmartphoneProps {
    brand?: string
    model?: string
    color?: string
    accentColor?: string
}

export default function StylizedSmartphone({
    brand = 'Apple',
    model = 'iPhone 15 Pro Max',
    color = 'Titanium Escuro',
    accentColor = '#00F0FF',
}: StylizedSmartphoneProps) {
    const groupRef = useRef<THREE.Group>(null)
    const phoneMeshRef = useRef<THREE.Mesh>(null)
    const hologramMaterialRef = useRef<any>(null)

    const [isPointerDown, setIsPointerDown] = useState(false)
    const [pointerStart, setPointerStart] = useState({ x: 0, y: 0 })

    // Materialization scan animation state
    const [scanProgress, setScanProgress] = useState(1.0)
    
    const manualRotation = use3dCatalogStore((state) => state.manualRotation)
    const setManualRotation = use3dCatalogStore((state) => state.setManualRotation)
    const setIsDraggingDevice = use3dCatalogStore((state) => state.setIsDraggingDevice)
    const scrollProgress = use3dCatalogStore((state) => state.scrollProgress)

    // Trigger materialization scan animation when product changes
    useEffect(() => {
        setScanProgress(0.0)
    }, [model, brand])

    // Dynamic rotation, float & shader time animation
    useFrame((state, delta) => {
        const time = state.clock.getElapsedTime()

        // Animate materialization scanprogress towards 1.0
        if (scanProgress < 1.0) {
            setScanProgress((prev) => Math.min(1.0, prev + delta * 2.2))
        }

        // Update Shader Uniforms
        if (hologramMaterialRef.current) {
            hologramMaterialRef.current.uTime = time
            hologramMaterialRef.current.uScanProgress = scanProgress
            hologramMaterialRef.current.uColor.set(accentColor)
        }

        if (!groupRef.current) return

        // Gentle floating bob
        const floatY = Math.sin(time * 1.5) * 0.08

        // Base auto-orbit based on scroll
        const scrollOrbitY = scrollProgress * Math.PI * 2.5
        const targetRotX = manualRotation[0] + Math.sin(time * 0.8) * 0.05
        const targetRotY = scrollOrbitY + manualRotation[1]

        // Smooth damping
        groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, floatY, delta * 4)
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotX, delta * 5)
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, delta * 5)
    })

    const handlePointerDown = (e: any) => {
        e.stopPropagation()
        setIsPointerDown(true)
        setIsDraggingDevice(true)
        setPointerStart({ x: e.clientX, y: e.clientY })
    }

    const handlePointerMove = (e: any) => {
        if (!isPointerDown) return
        e.stopPropagation()
        const deltaX = (e.clientX - pointerStart.x) * 0.005
        const deltaY = (e.clientY - pointerStart.y) * 0.005

        setManualRotation([
            Math.max(-Math.PI / 3, Math.min(Math.PI / 3, manualRotation[0] + deltaY)),
            manualRotation[1] + deltaX,
        ])
        setPointerStart({ x: e.clientX, y: e.clientY })
    }

    const handlePointerUp = () => {
        setIsPointerDown(false)
        setIsDraggingDevice(false)
    }

    return (
        <group
            ref={groupRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
        >
            {/* MAIN SMARTPHONE CHASSIS (RoundedBox) */}
            <RoundedBox
                ref={phoneMeshRef}
                args={[1.8, 3.8, 0.18]}
                radius={0.18}
                smoothness={8}
                castShadow
                receiveShadow
            >
                <meshPhysicalMaterial
                    color="#080c14"
                    metalness={0.96}
                    roughness={0.15}
                    clearcoat={1.0}
                    clearcoatRoughness={0.1}
                    reflectivity={1.0}
                />
            </RoundedBox>

            {/* HIGH-PRECISION METALLIC BEZEL BORDER */}
            <RoundedBox
                args={[1.82, 3.82, 0.17]}
                radius={0.19}
                smoothness={8}
            >
                <meshStandardMaterial
                    color={accentColor}
                    metalness={0.9}
                    roughness={0.2}
                    transparent
                    opacity={0.2}
                />
            </RoundedBox>

            {/* FRONT SCREEN PLANE WITH CUSTOM GLSL HOLOGRAM SHADER */}
            <mesh position={[0, 0, 0.092]}>
                <planeGeometry args={[1.68, 3.65]} />
                <hologramMaterial
                    ref={hologramMaterialRef}
                    key={HologramMaterial.key}
                    uColor={new THREE.Color(accentColor)}
                    uAccentColor={new THREE.Color('#10B981')}
                    uScanLineColor={new THREE.Color('#38BDF8')}
                    transparent
                />
            </mesh>

            {/* REAR CAMERA BUMP MODULE */}
            <group position={[-0.45, 1.2, -0.095]}>
                <RoundedBox args={[0.7, 0.7, 0.06]} radius={0.12} smoothness={6}>
                    <meshPhysicalMaterial
                        color="#0f172a"
                        metalness={0.98}
                        roughness={0.08}
                        clearcoat={1.0}
                    />
                </RoundedBox>
                {/* Lenses */}
                <mesh position={[-0.18, 0.18, -0.035]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.12, 0.12, 0.04, 16]} />
                    <meshStandardMaterial color="#000000" metalness={0.95} roughness={0.05} />
                </mesh>
                <mesh position={[0.18, 0.18, -0.035]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.12, 0.12, 0.04, 16]} />
                    <meshStandardMaterial color="#000000" metalness={0.95} roughness={0.05} />
                </mesh>
                <mesh position={[-0.18, -0.18, -0.035]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.12, 0.12, 0.04, 16]} />
                    <meshStandardMaterial color="#000000" metalness={0.95} roughness={0.05} />
                </mesh>
            </group>
        </group>
    )
}
