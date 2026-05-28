"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";
import { useRef } from "react";

// Animated, lightweight 3D hero for the landing page.
// A morphing violet sphere as the centerpiece, with four wellness-colored
// satellites orbiting at different speeds. Transparent canvas so it blends
// onto the page gradient.

function Center() {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.3;
  });
  return (
    <Float speed={2} rotationIntensity={0.6} floatIntensity={0.8}>
      <mesh ref={ref}>
        <icosahedronGeometry args={[1.3, 4]} />
        <MeshDistortMaterial
          color="#8b5cf6"
          distort={0.45}
          speed={2.2}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>
    </Float>
  );
}

function Orbit({ phase = 0, radius = 2.6, color = "#e0697a", speed = 0.5, size = 0.18 }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * speed + phase;
    ref.current.position.x = Math.cos(t) * radius;
    ref.current.position.z = Math.sin(t) * radius;
    ref.current.position.y = Math.sin(t * 1.6) * 0.35;
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[size, 32, 32]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.05} emissive={color} emissiveIntensity={0.2} />
    </mesh>
  );
}

export default function Hero3D() {
  return (
    <div
      className="relative mx-auto h-[320px] w-full sm:h-[420px]"
      aria-label="Decorative 3D animation of a wellness sphere with orbiting elements"
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ alpha: true, antialias: true }}
        // Transparent so the page gradient shows through.
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[5, 5, 5]} intensity={1.1} color="#ffffff" />
        <directionalLight position={[-4, -2, -3]} intensity={0.4} color="#f0934e" />
        <Center />
        {/* Four wellness-themed satellites */}
        <Orbit phase={0} radius={2.5} color="#e0697a" speed={0.5} />            {/* health red */}
        <Orbit phase={Math.PI * 0.5} radius={2.9} color="#3f9e6b" speed={0.42} />{/* green */}
        <Orbit phase={Math.PI} radius={2.3} color="#e2a93f" speed={0.6} />       {/* amber */}
        <Orbit phase={Math.PI * 1.5} radius={2.7} color="#4a6fa5" speed={0.46} />{/* calm blue */}
      </Canvas>
    </div>
  );
}
