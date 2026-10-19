import { isAndroidNativeRuntime } from '../utils/platform';
import { isAndroidPerformanceEnabled, useAndroidPerformanceStore } from '../stores/useAndroidPerformanceStore';
import '../styles/androidPerformance.css';

// src/services/androidPerformance.ts
// Reflect the active rendering profile into compositor-only styles.
export function installAndroidPerformancePreference() {
    const apply = () => {
        document.documentElement.dataset.foliaAndroid = String(isAndroidNativeRuntime());
        document.documentElement.dataset.foliaAndroidPerformance = String(isAndroidPerformanceEnabled());
    };
    apply();
    return useAndroidPerformanceStore.subscribe(apply);
}
