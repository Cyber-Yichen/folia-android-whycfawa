import React, { useCallback, useEffect, useRef } from 'react';
import { useWallPointerPan } from '../../src/components/wall/useWallPointerPan';
import { useTouchWallCenterFocus } from '../../src/components/wall/useTouchWallCenterFocus';
import { formatWorldTransform } from '../../src/components/wall/wallView';
import type { LatticeCamera } from '../../src/components/wall/useWallCameraPan';
import type { ProbeDefinition } from './definition';

// A deterministic wall uses the production gesture controller and centre hit testing.
function AndroidTouchWall() {
    const containerRef = useRef<HTMLDivElement>(null), worldRef = useRef<HTMLDivElement>(null);
    const cameraRef = useRef({ x: 100, y: 80, scale: 0.6 }), viewportRef = useRef({ width: 1000, height: 450 });
    const animationRef = useRef<{ stop: () => void } | null>(null);
    const focused = useTouchWallCenterFocus(containerRef);
    const applyCamera = useCallback((camera: LatticeCamera) => {
        cameraRef.current = camera;
        if (worldRef.current) worldRef.current.style.transform = formatWorldTransform(camera.x, camera.y, camera.scale);
        if (containerRef.current) containerRef.current.dataset.camera = JSON.stringify(camera);
    }, []);
    const stopPan = useCallback(() => { animationRef.current?.stop(); animationRef.current = null; }, []);
    const getWorldBounds = useCallback((camera: LatticeCamera) => ({ left: -camera.x / camera.scale, right: (1000 - camera.x) / camera.scale, top: -camera.y / camera.scale, bottom: (450 - camera.y) / camera.scale }), []);
    const gestures = useWallPointerPan({ applyCamera, stopPan, animationRef, cameraRef, viewportRef, containerRef, getWorldBounds, reducedMotion: false, overscan: 500, bounds: { left: -3000, right: 3000, top: -3000, bottom: 3000 } });
    useEffect(() => applyCamera(cameraRef.current), [applyCamera]);
    return <div ref={containerRef} data-testid="touch-wall" data-focused={focused} className="relative h-screen overflow-hidden bg-zinc-950" style={{ touchAction: 'none' }}
        onPointerDown={gestures.onPointerDown} onPointerMove={gestures.onPointerMove} onPointerUp={gestures.onPointerUp} onPointerCancel={gestures.onPointerCancel} onClickCapture={gestures.onClickCapture}>
        <div ref={worldRef} className="lattice-world">
            {Array.from({ length: 24 }, (_, index) => <article key={index} className="lattice-poster absolute bg-slate-700" data-instance-id={String(index)} style={{ left: index % 6 * 272, top: Math.floor(index / 6) * 272, width: 256, height: 256 }}><span className="text-white">{index}</span></article>)}
        </div>
    </div>;
}
export default { id: 'androidTouchWall', title: 'Android wall gestures', description: 'Pinch, pan and centre focus', Component: AndroidTouchWall } satisfies ProbeDefinition;
