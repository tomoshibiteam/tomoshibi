import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const GlobeMesh = () => {
    const meshRef = useRef<THREE.Mesh>(null);
    const starsRef = useRef<THREE.Points>(null);

    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += delta * 0.05; // ゆっくり自転
            meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1; // わずかに揺らす
        }
        if (starsRef.current) {
            starsRef.current.rotation.y += delta * 0.02;
        }
    });

    return (
        <group position={[0, -0.5, 0]}>
            {/* メインの地球（ワイヤーフレーム）*/}
            <mesh ref={meshRef} scale={1.8}>
                <sphereGeometry args={[1, 24, 24]} />
                <meshBasicMaterial
                    color="#d4a574" // Brand Gold
                    wireframe={true}
                    transparent
                    opacity={0.3}
                />
            </mesh>

            {/* 内側のコア（少し暗い塊） */}
            <mesh scale={1.75}>
                <sphereGeometry args={[1, 32, 32]} />
                <meshBasicMaterial color="#2f1d0f" transparent opacity={0.5} />
            </mesh>

            {/* 周囲のパーティクル（星） */}
            <points ref={starsRef}>
                <sphereGeometry args={[3, 48, 48]} />
                <pointsMaterial color="#a8a29e" size={0.02} transparent opacity={0.4} sizeAttenuation={true} />
            </points>
        </group>
    );
};

const RetroGlobe = () => {
    return (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none fade-in-up">
            <Canvas
                camera={{ position: [0, 0, 5], fov: 45 }}
                gl={{ alpha: true, antialias: true }}
                dpr={[1, 2]} // 解像度調整
            >
                <ambientLight intensity={0.5} />
                <GlobeMesh />
            </Canvas>
            {/* 上からグラデーションをかけて馴染ませる */}
            <div className="absolute inset-0 bg-gradient-to-b from-stone-50/95 via-stone-50/20 to-stone-50/90 pointer-events-none" />
        </div>
    );
};

export default RetroGlobe;
