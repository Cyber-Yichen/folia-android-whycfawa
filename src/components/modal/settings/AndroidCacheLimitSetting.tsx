import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomSelect } from '../../shared/CustomSelect';
import { isAndroidNativeRuntime } from '../../../utils/platform';
import { useAudioSettingsStore } from '../../../stores/useAudioSettingsStore';

// src/components/modal/settings/AndroidCacheLimitSetting.tsx
// Custom ceilings are committed explicitly so typing cannot evict cache at intermediate values.
const PRESETS = [0.25, 0.5, 1, 2, 5, 10, 20, 0];
export default function AndroidCacheLimitSetting() {
    const { t } = useTranslation();
    const value = useAudioSettingsStore(state => state.mediaCacheLimitGb);
    const setValue = useAudioSettingsStore(state => state.handleSetMediaCacheLimitGb);
    const [custom, setCustom] = useState(!PRESETS.includes(value));
    const [draft, setDraft] = useState(String(value || 1));
    if (!isAndroidNativeRuntime()) return null;
    const parsed = Number(draft);
    const valid = draft.trim() !== '' && Number.isFinite(parsed) && parsed >= 0.01;
    const options = PRESETS.map(gb => ({
        value: String(gb), label: gb === 0 ? t('options.mediaCacheLimitNone') : String(gb) + ' GB',
    }));
    options.push({ value: 'custom', label: t('options.customCacheLimit') });
    return <div className="space-y-3 py-3">
        <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
                <div className="text-sm font-medium">{t('options.totalCacheLimit')}</div>
                <div className="text-xs opacity-50">{t('options.totalCacheLimitDesc')}</div>
            </div>
            <CustomSelect ariaLabel={t('options.totalCacheLimit')} value={custom ? 'custom' : String(value)}
                onChange={next => {
                    if (next === 'custom') { setDraft(String(value || 1)); setCustom(true); return; }
                    setCustom(false); setValue(Number(next));
                }} options={options} />
        </div>
        {custom && <form className="flex items-center gap-3" onSubmit={event => {
            event.preventDefault();
            if (valid) setValue(parsed);
        }}>
            <input type="number" inputMode="decimal" min="0.01" step="any" value={draft}
                aria-label={t('options.customCacheLimit')} onChange={event => setDraft(event.target.value)}
                className="min-w-0 w-28 rounded-lg border border-current/15 bg-transparent px-3 py-2 text-sm" />
            <span className="text-xs opacity-60">GB</span>
            <button type="submit" disabled={!valid} className="rounded-lg bg-current/10 px-4 py-2 text-sm disabled:opacity-30">
                {t('options.applyCacheLimit')}
            </button>
        </form>}
    </div>;
}
