import React from 'react';
import { useTranslation } from 'react-i18next';
import SettingsRow, { SettingsToggle } from './SettingsRow';
import { isAndroidNativeRuntime } from '../../../utils/platform';
import { useAndroidPerformanceStore } from '../../../stores/useAndroidPerformanceStore';

// src/components/modal/settings/AndroidPerformanceSetting.tsx
// Native-only quality/smoothness tradeoff, independent from the FPS slider.
export default function AndroidPerformanceSetting({ isDaylight = false, onColor }: { isDaylight?: boolean; onColor?: string }) {
    const { t } = useTranslation();
    const enabled = useAndroidPerformanceStore(state => state.enabled);
    const setEnabled = useAndroidPerformanceStore(state => state.setEnabled);
    if (!isAndroidNativeRuntime()) return null;
    return <SettingsRow dividerClass={isDaylight ? 'border-zinc-200' : 'border-white/10'} title={t('options.androidPerformanceMode')} description={t('options.androidPerformanceModeDesc')}
        control={<SettingsToggle ariaLabel={t('options.androidPerformanceMode')} checked={enabled} onChange={() => setEnabled(!enabled)} onColor={onColor} offClass={isDaylight ? 'bg-zinc-200' : 'bg-white/10'} />} />;
}
