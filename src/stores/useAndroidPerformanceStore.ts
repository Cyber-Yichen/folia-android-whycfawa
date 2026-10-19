import { create } from 'zustand';
import { getStoredBoolean, setStoredBoolean } from './storagePrimitives';
import { isAndroidNativeRuntime } from '../utils/platform';

// src/stores/useAndroidPerformanceStore.ts
// One reversible Android rendering profile; frame-rate preferences remain independent.
export const ANDROID_PERFORMANCE_KEY = 'folia_android_performance_mode';
export const useAndroidPerformanceStore = create<{
    enabled: boolean;
    setEnabled: (enabled: boolean) => void;
}>((set) => ({
    enabled: getStoredBoolean(ANDROID_PERFORMANCE_KEY, true),
    setEnabled: enabled => {
        setStoredBoolean(ANDROID_PERFORMANCE_KEY, enabled);
        set({ enabled });
    },
}));
export const isAndroidPerformanceEnabled = () => isAndroidNativeRuntime() && useAndroidPerformanceStore.getState().enabled;
export const androidRenderResolution = (resolution: number, width = 0, height = 0): number => {
    if (!isAndroidPerformanceEnabled() || !Number.isFinite(resolution) || resolution <= 0) return resolution;
    const pixelCap = width > 0 && height > 0 ? Math.sqrt(960 * 540 / (width * height)) : 1;
    return Math.min(resolution, 1, pixelCap);
};
