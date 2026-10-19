import { describe, expect, it } from 'vitest';
import { touchDistance, touchMidpoint, zoomWallCamera } from '../../../src/components/wall/wallTouchMotion';
import { resolveLatticeViewportScale } from '../../../src/components/app/lattice/latticeViewportScale';

// Zoom must preserve the point under the fingers and fit the expanded player on short screens.
describe('native wall zoom', () => {
    it('anchors the original world point to the moving midpoint', () => {
        const start = { x: -100, y: 50, scale: 0.5 };
        const next = zoomWallCamera(start, { x: 300, y: 200 }, { x: 340, y: 240 }, 2);
        expect(next).toEqual({ x: -460, y: -60, scale: 1 });
        expect((340 - next.x) / next.scale).toBe((300 - start.x) / start.scale);
        expect((240 - next.y) / next.scale).toBe((200 - start.y) / start.scale);
    });
    it('clamps zoom while retaining its anchor', () => {
        expect(zoomWallCamera({ x: 0, y: 0, scale: 0.5 }, { x: 100, y: 100 }, { x: 100, y: 100 }, 100)).toEqual({ x: -200, y: -200, scale: 1.5 });
        expect(zoomWallCamera({ x: 0, y: 0, scale: 0.5 }, { x: 0, y: 0 }, { x: 0, y: 0 }, 0.01).scale).toBe(0.28);
    });
    it('derives a midpoint and distance independent of finger order', () => {
        expect(touchMidpoint({ x: 0, y: 0 }, { x: 6, y: 8 })).toEqual({ x: 3, y: 4 });
        expect(touchDistance({ x: 0, y: 0 }, { x: 6, y: 8 })).toBe(10);
    });
    it.each([[1000, 450], [568, 320], [390, 760]])('fits an expanded card at %dx%d', (width, height) => {
        const scale = resolveLatticeViewportScale(width, height, 808, true);
        expect(808 * scale).toBeLessThanOrEqual(height - 168);
        expect(808 * scale).toBeLessThanOrEqual(width - 32);
    });
});
