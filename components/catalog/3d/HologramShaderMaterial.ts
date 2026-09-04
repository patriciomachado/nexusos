import * as THREE from 'three'
import { shaderMaterial } from '@react-three/drei'
import { extend, ThreeElement } from '@react-three/fiber'

export const HologramMaterial = shaderMaterial(
    {
        uTime: 0,
        uColor: new THREE.Color('#00F0FF'),
        uAccentColor: new THREE.Color('#10B981'),
        uScanProgress: 1.0, // 0 to 1 materialization scan
        uScanLineColor: new THREE.Color('#38BDF8'),
    },
    // VERTEX SHADER
    /* glsl */ `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vViewPosition;

    void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vPosition = position;
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
    }
    `,
    // FRAGMENT SHADER
    /* glsl */ `
    uniform float uTime;
    uniform vec3 uColor;
    uniform vec3 uAccentColor;
    uniform float uScanProgress;
    uniform vec3 uScanLineColor;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vViewPosition;

    void main() {
        // Fresnel Effect for glow along screen edges
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = pow(1.0 - max(0.0, dot(normal, viewDir)), 2.5);

        // Animated Scanlines
        float scanline = sin((vUv.y + uTime * 0.15) * 120.0) * 0.15 + 0.85;

        // Animated Grid
        vec2 gridUv = fract(vUv * vec2(20.0, 40.0));
        float gridLine = smoothstep(0.02, 0.05, gridUv.x) * smoothstep(0.02, 0.05, gridUv.y);
        float gridGlow = (1.0 - gridLine) * 0.2;

        // Base hologram screen color blend
        vec3 baseColor = mix(uColor, uAccentColor, sin(uTime * 0.5 + vUv.y * 3.0) * 0.5 + 0.5);
        vec3 finalColor = baseColor * (scanline + gridGlow) + uColor * fresnel * 1.5;

        // Materialization Laser Scan Beam
        float scanY = 1.0 - uScanProgress; // 0 (top) to 1 (bottom)
        float beamDistance = abs(vUv.y - scanY);
        float beamWidth = 0.08;
        float beamIntensity = smoothstep(beamWidth, 0.0, beamDistance);

        // Add bright laser scan line
        finalColor += uScanLineColor * beamIntensity * 4.0;

        // Discard pixel if above scan line during materialization phase
        if (vUv.y > (1.0 - uScanProgress + 0.02) && uScanProgress < 0.99) {
            discard;
        }

        gl_FragColor = vec4(finalColor, 0.95);
    }
    `
)

extend({ HologramMaterial })

declare module '@react-three/fiber' {
    interface ThreeElements {
        hologramMaterial: ThreeElement<typeof THREE.ShaderMaterial> & {
            uColor?: THREE.Color | string
            uAccentColor?: THREE.Color | string
            uScanLineColor?: THREE.Color | string
            uScanProgress?: number
            uTime?: number
        }
    }
}
