"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { OrbitControls } from "three-stdlib";

export function FlyThrough({
  playing,
  length,
  height,
  controls,
  onEnd,
  publish,
}: {
  playing: boolean;
  length: number;
  height: number;
  controls: React.RefObject<OrbitControls | null>;
  onEnd: () => void;
  publish: () => void;
}) {
  const elapsed = useRef(0);
  const camera = useThree((s) => s.camera);
  const path = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.45 * length, height * 2.5, length * 0.6),
        new THREE.Vector3(length * 0.15, height * 1.8, length * 0.45),
        new THREE.Vector3(length * 0.9, height * 1.6, length * 0.4),
        new THREE.Vector3(length * 1.8, height * 2, length * 0.6),
      ]),
    [length, height],
  );
  useEffect(() => {
    if (playing && elapsed.current >= 12) elapsed.current = 0;
  }, [playing]);
  useFrame((_, dt) => {
    if (!playing) return;
    elapsed.current = Math.min(12, elapsed.current + dt);
    const t = elapsed.current / 12;
    camera.position.copy(path.getPointAt(t));
    const target = new THREE.Vector3(length * (0.2 + 1.2 * t), height * 0.4, 0);
    camera.lookAt(target);
    controls.current?.target.copy(target);
    publish();
    if (t === 1) onEnd();
  });
  return null;
}

/** Records only the local WebGL canvas; no uploads and no external rendering service. */
export function CanvasRecorder({
  record,
  onEnd,
  onError,
}: {
  record: boolean;
  onEnd: () => void;
  onError: (message: string) => void;
}) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    if (!record) return undefined;
    let recorder: MediaRecorder | undefined;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((v) =>
        MediaRecorder.isTypeSupported(v),
      );
      if (!mime || !gl.domElement.captureStream)
        throw new Error(
          "This browser cannot record WebM. Use a browser with canvas.captureStream and WebM support.",
        );
      stream = gl.domElement.captureStream(30);
      recorder = new MediaRecorder(stream, { mimeType: mime });
      const chunks: Blob[] = [];
      recorder.addEventListener("dataavailable", (e) => {
        if (e.data.size) chunks.push(e.data);
      });
      recorder.addEventListener(
        "stop",
        () => {
          const url = URL.createObjectURL(new Blob(chunks, { type: mime }));
          const link = document.createElement("a");
          link.href = url;
          link.download = "daedalus-wind-tunnel.webm";
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          onEnd();
        },
        { once: true },
      );
      recorder.addEventListener("error", () =>
        onError("Canvas recording failed; no complete WebM is available."),
      );
      recorder.start(250);
      const active = recorder;
      timer = setTimeout(() => {
        if (active.state !== "inactive") active.stop();
      }, 12000);
    } catch (error) {
      queueMicrotask(() => {
        onError(error instanceof Error ? error.message : "Recording failed");
        onEnd();
      });
    }
    return () => {
      clearTimeout(timer);
      if (recorder && recorder.state !== "inactive") recorder.stop();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [record, gl, onEnd, onError]);
  return null;
}
