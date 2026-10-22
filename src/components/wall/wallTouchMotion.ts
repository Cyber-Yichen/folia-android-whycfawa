import type { LatticeCamera } from './useWallCameraPan';

// Touch zoom keeps the world point between the two fingers anchored to their midpoint.
export type TouchPoint = { x: number; y: number };
export const touchMidpoint = (a: TouchPoint, b: TouchPoint): TouchPoint => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
export const touchDistance = (a: TouchPoint, b: TouchPoint): number => Math.hypot(a.x - b.x, a.y - b.y);
export const zoomWallCamera = (camera: LatticeCamera, anchor: TouchPoint, midpoint: TouchPoint, ratio: number): LatticeCamera => {
    const scale = Math.max(Math.min(0.28, camera.scale), Math.min(1.5, camera.scale * ratio));
    return { scale, x: midpoint.x - (anchor.x - camera.x) / camera.scale * scale, y: midpoint.y - (anchor.y - camera.y) / camera.scale * scale };
};
export const TOUCH_WALL_INERTIA = { minSpeed: 70, maxSpeed: 2400, power: 0.24, timeConstant: 325, staleReleaseMs: 90 };
