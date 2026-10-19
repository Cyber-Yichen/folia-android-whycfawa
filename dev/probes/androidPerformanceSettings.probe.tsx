import React from 'react';
import AndroidPerformanceSetting from '../../src/components/modal/settings/AndroidPerformanceSetting';
import AndroidCacheLimitSetting from '../../src/components/modal/settings/AndroidCacheLimitSetting';
import CommandPaletteButtonSetting from '../../src/components/modal/settings/CommandPaletteButtonSetting';
import BottomCommandPaletteButton from '../../src/components/app/overlays/BottomCommandPaletteButton';
import HomeTabIcon from '../../src/components/shared/HomeTabIcon';
import { useAndroidPerformanceStore } from '../../src/stores/useAndroidPerformanceStore';
import { installAndroidPerformancePreference } from '../../src/services/androidPerformance';
import type { ProbeDefinition } from './definition';

// dev/probes/androidPerformanceSettings.probe.tsx
// Real Android controls, live profile switching and persistent launcher visibility.
function AndroidSettingsProbe() {
    React.useEffect(installAndroidPerformancePreference, []);
    const enabled = useAndroidPerformanceStore(state => state.enabled);
    return <div className="min-h-screen bg-zinc-950 p-6 text-white" data-profile={String(enabled)}>
        <div className="max-w-xl">
            <AndroidPerformanceSetting />
            <CommandPaletteButtonSetting isDaylight={false} settingsCardClass="border-white/10" />
            <AndroidCacheLimitSetting />
        </div>
        <nav aria-label="Library categories" className="flex gap-4">
            {['playlist', 'radio', 'albums', 'local', 'navidrome'].map(tab =>
                <button key={tab} aria-label={tab}><HomeTabIcon tab={tab} /></button>)}
        </nav>
        <BottomCommandPaletteButton />
    </div>;
}
export default { id: 'androidPerformanceSettings', title: 'Android settings', description: 'Android profile and cache controls', Component: AndroidSettingsProbe } satisfies ProbeDefinition;
