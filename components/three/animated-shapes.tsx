"use client"

import { useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Box, Torus } from "@react-three/drei"
import type * as THREE from "three"

function RotatingShape() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.003
      meshRef.current.rotation.y += 0.005
    }
  })

  return (
    <mesh ref={meshRef}>
      <Torus args={[1, 0.4, 100, 100]} />
      <meshPhongMaterial color="#2563eb" wireframe={false} emissive="#1d4ed8" emissiveIntensity={0.3} />
    </mesh>
  )
}

function FloatingCube() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(clock.elapsedTime) * 0.5
      meshRef.current.rotation.x = clock.elapsedTime * 0.3
      meshRef.current.rotation.y = clock.elapsedTime * 0.4
    }
  })

  return (
    <mesh ref={meshRef} position={[-2, 0, 0]}>
      <Box args={[0.8, 0.8, 0.8]} />
      <meshPhongMaterial color="#059669" wireframe={true} />
    </mesh>
  )
}

export default function AnimatedShapes() {
  return (
    <Canvas camera={{ position: [0, 0, 3], fov: 75 }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <RotatingShape />
      <FloatingCube />
      <OrbitControls enableZoom={false} />
    </Canvas>
  )
}
