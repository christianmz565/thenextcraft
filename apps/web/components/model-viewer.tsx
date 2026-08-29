"use client";

import { OrbitControls, Stage, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Component, type ReactNode, Suspense } from "react";

import { cn } from "@/lib/utils";

const MODEL_URL = "/models/model.glb";

function Model() {
  const { scene } = useGLTF(MODEL_URL);
  return <primitive object={scene} />;
}
useGLTF.preload(MODEL_URL);

class ModelErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function ModelFallback() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
      <span>Modelo no encontrado</span>
      <span>Coloca model.glb en apps/web/public/models/</span>
    </div>
  );
}

type ModelViewerProps = { className?: string; paused?: boolean };

export function ModelViewer({ className, paused = false }: ModelViewerProps) {
  const interactive = !paused;

  return (
    <div className={cn("relative", className)}>
      <ModelErrorBoundary fallback={<ModelFallback />}>
        <Canvas
          className="!touch-none"
          style={{ pointerEvents: interactive ? "auto" : "none" }}
          camera={{ position: [3.2, 1.8, 4.2], fov: 38 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
        >
          <Suspense fallback={null}>
            <Stage environment="city" intensity={0.55} shadows="contact" adjustCamera={1.4}>
              <Model />
            </Stage>
            <OrbitControls
              makeDefault
              enabled={interactive}
              enablePan={false}
              enableZoom={false}
              autoRotate={interactive}
              autoRotateSpeed={1.1}
              minPolarAngle={Math.PI / 3}
              maxPolarAngle={Math.PI / 1.8}
            />
          </Suspense>
        </Canvas>
      </ModelErrorBoundary>
    </div>
  );
}
