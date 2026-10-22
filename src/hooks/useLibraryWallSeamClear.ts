import { useLibraryWallLookStore } from '../stores/useLibraryWallLookStore';
import { isAndroidPerformanceEnabled, useAndroidPerformanceStore } from '../stores/useAndroidPerformanceStore';

// src/hooks/useLibraryWallSeamClear.ts
// Device rendering overrides preserve the saved wall appearance.
export function useLibraryWallSeamClear() {
    const preferred = useLibraryWallLookStore(state => state.seamClear);
    const performanceMode = useAndroidPerformanceStore(() => isAndroidPerformanceEnabled());
    return { seamClear: preferred && !performanceMode, performanceMode };
}
