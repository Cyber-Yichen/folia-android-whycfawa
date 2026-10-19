import React from 'react';
import { useTranslation } from 'react-i18next';
import { CustomSelect } from '../../shared/CustomSelect';
import { isAndroidNativeRuntime } from '../../../utils/platform';
import { useAudioSettingsStore } from '../../../stores/useAudioSettingsStore';

// src/components/modal/settings/AndroidCacheLimitSetting.tsx
// One ceiling for all rebuildable Android caches.
export default function AndroidCacheLimitSetting() {
    const { t } = useTranslation();
    const value = useAudioSettingsStore(state => state.mediaCacheLimitGb);
    const setValue = useAudioSettingsStore(state => state.handleSetMediaCacheLimitGb);
    if (!isAndroidNativeRuntime()) return null;
    const options = [0.25, 0.5, 1, 2, 5, 10, 20, 0].map(gb => ({
        value: String(gb), label: gb === 0 ? t('options.mediaCacheLimitNone') : String(gb) + ' GB',
    }));
    return <div className="flex items-center justify-between gap-4 py-3">
        <div className="min-w-0">
            <div className="text-sm font-medium">{t('options.totalCacheLimit')}</div>
            <div className="text-xs opacity-50">{t('options.totalCacheLimitDesc')}</div>
        </div>
        <CustomSelect ariaLabel={t('options.totalCacheLimit')} value={String(value)} onChange={next => setValue(Number(next))} options={options} />
    </div>;
}
