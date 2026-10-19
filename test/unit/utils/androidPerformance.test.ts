import { afterEach, describe, expect, it, vi } from 'vitest';
import { androidRenderResolution, useAndroidPerformanceStore } from '@/stores/useAndroidPerformanceStore';
import { parseVisualizerFrameRate } from '@/utils/frameRateLimiter';
import { compressConfig, decompressConfig } from '@/utils/appearanceCodec';

// test/unit/utils/androidPerformance.test.ts
// Native defaults, user FPS overrides and reversible rendering budgets.
afterEach(() => { vi.unstubAllGlobals(); useAndroidPerformanceStore.setState({ enabled: true }); });
describe('Android rendering preferences', () => {
    it('defaults native FPS to 60 while preserving every explicit user choice', () => {
        vi.stubGlobal('window', { Capacitor: { getPlatform: () => 'android' } });
        expect(parseVisualizerFrameRate(null)).toBe(60);
        for (const fps of [30, 60, 90, 120]) expect(parseVisualizerFrameRate(String(fps))).toBe(fps);
        expect(parseVisualizerFrameRate('off')).toBe('off');
        useAndroidPerformanceStore.setState({ enabled: false });
        expect(parseVisualizerFrameRate(null)).toBe(60);
    });
    it('caps drawing pixels only when native performance mode is enabled', () => {
        vi.stubGlobal('window', { Capacitor: { getPlatform: () => 'android' } });
        const scale = androidRenderResolution(2, 1600, 900);
        expect(1600 * 900 * scale ** 2).toBeLessThanOrEqual(960 * 540 + 0.1);
        useAndroidPerformanceStore.setState({ enabled: false });
        expect(androidRenderResolution(2, 1600, 900)).toBe(2);
        vi.stubGlobal('window', {});
        useAndroidPerformanceStore.setState({ enabled: true });
        expect(androidRenderResolution(2, 1600, 900)).toBe(2);
        expect(parseVisualizerFrameRate(null)).toBe('off');
    });
    it('round-trips both performance preferences in shortcodes and JSON', () => {
        for (const enabled of [true, false]) {
            const config = { androidPerformanceMode: enabled };
            expect(decompressConfig(compressConfig(config)).androidPerformanceMode).toBe(enabled);
            expect(decompressConfig(JSON.stringify(config)).androidPerformanceMode).toBe(enabled);
        }
    });
});
