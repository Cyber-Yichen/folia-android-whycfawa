import { Maximize, PanelBottom } from 'lucide-react';
import { createToggleCommand } from '../commandFactories';
import { useAndroidLayoutSettingsStore } from '../../../stores/useAndroidLayoutSettingsStore';

// Native playback visibility commands mirror the two settings toggles.
export const androidLayoutCommands = [
    createToggleCommand('android-immersive-toggle', 'settings', 'Immersive playback', 'Automatically hide playback interface controls',
        ['immersive', '全沉浸', '播放按钮', '自动隐藏'], () => {
            const state = useAndroidLayoutSettingsStore.getState(); state.setImmersiveModeEnabled(!state.immersiveModeEnabled);
        }, { icon: Maximize, platform: ['android'] }),
    createToggleCommand('android-immersive-transport-toggle', 'settings', 'Auto-hide playback bar', 'Include the playback bar in immersive auto-hide',
        ['transport', 'immersive', '播放栏', '自动隐藏'], () => {
            const state = useAndroidLayoutSettingsStore.getState(); state.setImmersiveHideTransport(!state.immersiveHideTransport);
        }, { icon: PanelBottom, platform: ['android'], isAvailable: () => useAndroidLayoutSettingsStore.getState().immersiveModeEnabled }),
];
