"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { LineMaterial, LineSegments2, LineSegmentsGeometry } from "three-stdlib";
import * as THREE from "three";
import type { FlowLines } from "@/lib/api";
import type { PackedLines, WorkerResult } from "./flowMath";

/** Worker packing keeps dense oil traces and density changes off the render thread. */
export function SmokeStreams({
  lines,
  animate,
  density,
  white = false,
  onError,
}: {
  lines: FlowLines;
  animate: boolean;
  density: number;
  white?: boolean;
  onError: (message: string) => void;
}) {
  const [packed, setPacked] = useState<PackedLines | null>(null);
  useEffect(() => {
    const worker = new Worker(new URL("./flow.worker.ts", import.meta.url), { type: "module" });
    const timer = setTimeout(() => {
      const positions = lines.positions.slice(),
        scalar = lines.scalar.slice(),
        offsets = lines.offsets.slice();
      worker.postMessage(
        { kind: "lines", lines: { ...lines, positions, scalar, offsets }, density, white },
        [positions.buffer, scalar.buffer, offsets.buffer],
      );
    }, 120);
    worker.addEventListener("message", (event: MessageEvent<WorkerResult>) => {
      if (event.data.kind === "lines") setPacked(event.data.data);
      else if (event.data.kind === "error") onError(event.data.message);
    });
    worker.addEventListener("error", () =>
      onError("Flow-line worker failed. Reload the flow export."),
    );
    return () => {
      clearTimeout(timer);
      worker.terminate();
    };
  }, [lines, density, white, onError]);
  return packed ? <PackedStreams packed={packed} animate={animate} white={white} /> : null;
}

function PackedStreams({
  packed,
  animate,
  white,
}: {
  packed: PackedLines;
  animate: boolean;
  white: boolean;
}) {
  const size = useThree((s) => s.size);
  const line = useRef<LineSegments2>(null);
  const object = useMemo(() => {
    const g = new LineSegmentsGeometry();
    g.setPositions(packed.positions);
    g.setColors(packed.colors);
    g.setAttribute("instanceArc", new THREE.InstancedBufferAttribute(packed.arcs, 2));
    const m = new LineMaterial({
      linewidth: white ? 0.8 : 1.5,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    m.uniforms.uFlowTime = { value: 0 };
    m.uniforms.uFlowAnimate = { value: 0 };
    m.vertexShader =
      "attribute vec2 instanceArc; varying float vFlowArc; varying float vFlowDepth;\n" +
      m.vertexShader.replace(
        "void main() {",
        "void main() {\nvFlowArc = position.y < .5 ? instanceArc.x : instanceArc.y;\nvFlowDepth = abs((modelViewMatrix * vec4(instanceStart,1.)).z);",
      );
    m.fragmentShader =
      "uniform float uFlowTime,uFlowAnimate; varying float vFlowArc,vFlowDepth;\n" +
      m.fragmentShader.replace(
        "gl_FragColor = diffuseColor;",
        `
      float phase=fract(vFlowArc*18.-uFlowTime*.9);
      float head=1.-smoothstep(.0,.16,phase);
      diffuseColor.a*=mix(.85,.2+.75*head,uFlowAnimate)*clamp(1.5/(1.+vFlowDepth*4.),.15,1.);
      diffuseColor.rgb*=mix(.8,.6+1.8*head,uFlowAnimate);
      gl_FragColor=diffuseColor;
    `,
      );
    return new LineSegments2(g, m);
  }, [packed, white]);
  useEffect(
    () => () => {
      object.geometry.dispose();
      object.material.dispose();
    },
    [object],
  );
  useEffect(() => {
    object.material.resolution.set(size.width, size.height);
  }, [object, size]);
  useFrame((_, dt) => {
    const material = line.current?.material;
    if (!material) return;
    material.uniforms.uFlowAnimate.value = animate ? 1 : 0;
    if (animate) material.uniforms.uFlowTime.value += dt;
  });
  return <primitive ref={line} object={object} raycast={() => null} />;
}
