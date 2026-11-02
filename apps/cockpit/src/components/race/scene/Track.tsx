"use client";

import { MeshReflectorMaterial } from "@react-three/drei";
import { SceneLabel } from "@/components/scene/SceneLabel";

const HALF = 0.22;
export function Track({
  length,
  time,
  distance,
  low,
}: {
  length: number;
  time: number;
  distance: number;
  low: boolean;
}) {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[length / 2, -0.009, 0]} receiveShadow>
        <planeGeometry args={[length + 5, 7]} />
        {low ? (
          <meshStandardMaterial color="#161b22" roughness={0.7} />
        ) : (
          <MeshReflectorMaterial
            resolution={256}
            blur={[64, 32]}
            mixBlur={0.8}
            mixStrength={0.3}
            roughness={0.6}
            metalness={0.25}
            color="#161b22"
            mirror={0.12}
          />
        )}
      </mesh>
      <mesh position={[length / 2, -0.004, 0]} receiveShadow>
        <boxGeometry args={[length + 0.5, 0.008, HALF * 2]} />
        <meshStandardMaterial color="#454a50" roughness={0.7} />
      </mesh>
      {[-HALF, HALF].map((z) => (
        <mesh key={z} position={[length / 2, 0.016, z]}>
          <boxGeometry args={[length + 0.5, 0.032, 0.009]} />
          <meshStandardMaterial color="#a9b0b6" metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
      {[-0.09, 0.09].map((z) => (
        <mesh key={z} position={[length / 2, 0.001, z]}>
          <boxGeometry args={[length, 0.0006, 0.0006]} />
          <meshStandardMaterial color="#aab2bd" />
        </mesh>
      ))}
      {Array.from({ length: 8 }, (_, i) => (length * (i + 1)) / 8).map((x, i) => (
        <group key={i} position={[x, 0, 0]}>
          <mesh position={[0, 0.001, 0]}>
            <boxGeometry args={[0.002, 0.001, HALF * 2]} />
            <meshBasicMaterial color={distance >= x ? "#92c3b6" : "#8c9299"} />
          </mesh>
          <SceneLabel
            depthTest
            size={0.012}
            color="#d3d8de"
            position={[0, 0.008, -0.3]}
          >{`${x.toFixed(1)} m`}</SceneLabel>
        </group>
      ))}
      {[0, length].map((x, i) => (
        <group key={x} position={[x, 0, 0]}>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[0, 0.095, side * (HALF + 0.02)]}>
              <boxGeometry args={[0.012, 0.19, 0.012]} />
              <meshStandardMaterial color="#6a747f" metalness={0.7} roughness={0.3} />
            </mesh>
          ))}
          <mesh position={[0, 0.19, 0]}>
            <boxGeometry args={[0.025, 0.025, HALF * 2 + 0.055]} />
            <meshStandardMaterial color="#303841" />
          </mesh>
          <SceneLabel size={0.01} color="#ebeff3" position={[0, 0.1, HALF + 0.06]}>
            {i === 0 ? "START" : `FINISH / ${length.toFixed(1)} m`}
          </SceneLabel>
          {i === 0 &&
            Array.from({ length: 5 }, (_, n) => (
              <mesh key={n} position={[0.015, 0.19, (n - 2) * 0.055]} rotation-y={Math.PI / 2}>
                <circleGeometry args={[0.012, 12]} />
                <meshBasicMaterial color={time > 0 ? "#79baa7" : "#dc5e63"} toneMapped={false} />
              </mesh>
            ))}
          {i === 1 &&
            Array.from({ length: 16 }, (_, n) => (
              <mesh
                key={n}
                position={[(Math.floor(n / 8) - 0.5) * 0.018, 0.001, ((n % 8) - 3.5) * 0.05]}
                rotation-x={-Math.PI / 2}
              >
                <planeGeometry args={[0.018, 0.05]} />
                <meshBasicMaterial color={(n + Math.floor(n / 8)) % 2 ? "#d9dce0" : "#1c2128"} />
              </mesh>
            ))}
        </group>
      ))}
    </group>
  );
}
