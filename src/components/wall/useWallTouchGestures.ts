import { animate } from 'framer-motion';
import { createTouchCameraFrame } from './touchCameraFrame';
import { useCallback, useEffect, useRef, type MutableRefObject, type PointerEvent } from 'react';
import type { LatticeCamera } from './useWallCameraPan';
import { touchDistance, touchMidpoint, zoomWallCamera, TOUCH_WALL_INERTIA, type TouchPoint } from './wallTouchMotion';

// Native touch panning, filtered release velocity and anchored two-finger zoom bypass React renders.
type Options = {
    cameraRef: MutableRefObject<LatticeCamera>;
    animationRef: MutableRefObject<{ stop: () => void } | null>;
    didDragRef: MutableRefObject<boolean>;
    stopPan: () => void;
    updateCamera: (x: number, y: number, scale?: number) => void;
    reducedMotion: boolean | null;
    onZoomEnd?: (scale: number) => void;
};
export const useWallTouchGestures = ({ cameraRef, animationRef, didDragRef, stopPan, updateCamera, reducedMotion, onZoomEnd }: Options) => {
    const contacts = useRef(new Map<number, TouchPoint>());
    const originRef = useRef<{ left: number; top: number } | null>(null);
    const writeCameraRef = useRef(updateCamera);
    writeCameraRef.current = updateCamera;
    const frameRef = useRef<ReturnType<typeof createTouchCameraFrame> | null>(null);
    if (!frameRef.current) frameRef.current = createTouchCameraFrame(camera =>
        writeCameraRef.current(camera.x, camera.y, camera.scale));
    const drag = useRef<{ start: TouchPoint; camera: LatticeCamera; last: TouchPoint; time: number; vx: number; vy: number; moved: boolean } | null>(null);
    const pinch = useRef<{ camera: LatticeCamera; anchor: TouchPoint; distance: number } | null>(null);
    const zoomEndRef = useRef(onZoomEnd);
    zoomEndRef.current = onZoomEnd;
    const rebase = (time: number) => {
        const point = [...contacts.current.values()][0];
        drag.current = point ? { start: point, last: point, camera: { ...cameraRef.current }, time, vx: 0, vy: 0, moved: false } : null;
    };
    const localPoint = (event: PointerEvent<HTMLDivElement>): TouchPoint => {
        const rect = originRef.current ?? event.currentTarget.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const onPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
        if (event.target instanceof Element && event.target.closest('button, input, textarea, select, a, [role="slider"], [contenteditable="true"]')) return;
        if (contacts.current.size >= 2) return;
        frameRef.current!.flush();
        stopPan();
        if (contacts.current.size === 0) originRef.current = event.currentTarget.getBoundingClientRect();
        contacts.current.set(event.pointerId, localPoint(event));
        if (contacts.current.size === 1) {
            didDragRef.current = false;
            rebase(event.timeStamp);
        } else {
            for (const id of contacts.current.keys()) event.currentTarget.setPointerCapture(id);
            const [a, b] = [...contacts.current.values()];
            pinch.current = { camera: { ...cameraRef.current }, anchor: touchMidpoint(a, b), distance: Math.max(1, touchDistance(a, b)) };
            didDragRef.current = true;
            drag.current = null;
        }
    }, [cameraRef, didDragRef, stopPan]);
    const onPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
        if (!contacts.current.has(event.pointerId)) return;
        const point = localPoint(event);
        contacts.current.set(event.pointerId, point);
        const zoom = pinch.current;
        if (zoom && contacts.current.size === 2) {
            const [a, b] = [...contacts.current.values()];
            const next = zoomWallCamera(zoom.camera, zoom.anchor, touchMidpoint(a, b), touchDistance(a, b) / zoom.distance);
            frameRef.current!.schedule(next);
            return;
        }
        const pan = drag.current;
        if (!pan) return;
        const dx = point.x - pan.start.x, dy = point.y - pan.start.y;
        if (!pan.moved && Math.hypot(dx, dy) > 7) { pan.moved = true; didDragRef.current = true; event.currentTarget.setPointerCapture(event.pointerId); }
        const dt = event.timeStamp - pan.time;
        if (dt > 0) {
            const blend = 1 - Math.exp(-dt / 40);
            pan.vx += ((point.x - pan.last.x) / dt * 1000 - pan.vx) * blend;
            pan.vy += ((point.y - pan.last.y) / dt * 1000 - pan.vy) * blend;
        }
        pan.last = point; pan.time = event.timeStamp;
        if (pan.moved) frameRef.current!.schedule({ x: pan.camera.x + dx, y: pan.camera.y + dy, scale: pan.camera.scale });
    }, [didDragRef]);
    const finish = useCallback((event: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
        if (!contacts.current.delete(event.pointerId)) return;
        if (cancelled) frameRef.current!.cancel(); else frameRef.current!.flush();
        const wasPinching = pinch.current !== null;
        if (wasPinching) { pinch.current = null; zoomEndRef.current?.(cameraRef.current.scale); }
        const pan = drag.current;
        drag.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        if (contacts.current.size) { rebase(event.timeStamp); return; }
        originRef.current = null;
        if (cancelled || wasPinching || !pan?.moved || reducedMotion || event.timeStamp - pan.time > TOUCH_WALL_INERTIA.staleReleaseMs) return;
        const speed = Math.hypot(pan.vx, pan.vy);
        if (speed < TOUCH_WALL_INERTIA.minSpeed) return;
        const from = { ...cameraRef.current }, velocity = Math.min(speed, TOUCH_WALL_INERTIA.maxSpeed);
        animationRef.current = animate(0, velocity * TOUCH_WALL_INERTIA.power, {
            type: 'inertia', velocity, power: TOUCH_WALL_INERTIA.power, timeConstant: TOUCH_WALL_INERTIA.timeConstant, restDelta: 0.5,
            onUpdate: distance => updateCamera(from.x + distance * pan.vx / speed, from.y + distance * pan.vy / speed),
            onComplete: () => { animationRef.current = null; },
        });
    }, [animationRef, cameraRef, reducedMotion, updateCamera]);
    useEffect(() => {
        const cancel = () => {
            frameRef.current!.cancel();
            originRef.current = null;
            if (pinch.current) zoomEndRef.current?.(cameraRef.current.scale);
            contacts.current.clear(); drag.current = null; pinch.current = null; stopPan();
        };
        const endOutside = (event: globalThis.PointerEvent) => { if (contacts.current.has(event.pointerId)) cancel(); };
        window.addEventListener('blur', cancel);
        window.addEventListener('resize', cancel);
        window.addEventListener('pointerup', endOutside);
        window.addEventListener('pointercancel', endOutside);
        return () => { window.removeEventListener('blur', cancel); window.removeEventListener('resize', cancel); window.removeEventListener('pointerup', endOutside); window.removeEventListener('pointercancel', endOutside); cancel(); };
    }, [cameraRef, stopPan]);
    return { hasActivePointers: () => contacts.current.size > 0, onPointerDown, onPointerMove, onPointerUp: (event: PointerEvent<HTMLDivElement>) => finish(event, false), onPointerCancel: (event: PointerEvent<HTMLDivElement>) => finish(event, true) };
};
