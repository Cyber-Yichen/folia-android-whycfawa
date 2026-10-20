import React from 'react';
import { useTranslation } from 'react-i18next';
import { CustomSelect } from '../../shared/CustomSelect';
import { useTouchPlayerSettingsStore } from '../../../stores/useTouchPlayerSettingsStore';
import { isAndroidNativeRuntime } from '../../../utils/platform';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import type { Theme } from '../../../types';

// Touch-only appearance choices live beside the existing bottom-bar controls.
export default function TouchPlayerBarSettings({ isDaylight, theme, settingsCardClass }: {
    isDaylight: boolean; theme?: Theme; settingsCardClass: string;
}) {
    const { t } = useTranslation();
    const appearance = useTouchPlayerSettingsStore(state => state.appearance);
    const setAppearance = useTouchPlayerSettingsStore(state => state.setAppearance);
    const coarse = useMediaQuery('(hover: none) and (pointer: coarse)');
    if (!isAndroidNativeRuntime() && !coarse) return null;
    return <div className={'p-4 rounded-xl border space-y-4 ' + settingsCardClass}>
        <div className="flex flex-wrap gap-3">
            <div className="flex min-w-[160px] flex-1 flex-col gap-1.5">
                <span className="text-sm font-medium">{t('options.touchPlayerCompactStyle')}</span>
                <CustomSelect value={appearance.compactStyle} ariaLabel={t('options.touchPlayerCompactStyle')}
                    options={['cover', 'text', 'progress'].map(value => ({ value, label: t('options.touchPlayerStyle_' + value) }))}
                    onChange={compactStyle => setAppearance({ ...appearance, compactStyle })} isDaylight={isDaylight} theme={theme} />
            </div>
            <div className="flex min-w-[160px] flex-1 flex-col gap-1.5">
                <span className="text-sm font-medium">{t('options.touchPlayerExpansion')}</span>
                <CustomSelect value={appearance.expansion} ariaLabel={t('options.touchPlayerExpansion')}
                    options={['wide', 'tall'].map(value => ({ value, label: t('options.touchPlayerExpansion_' + value) }))}
                    onChange={expansion => setAppearance({ ...appearance, expansion })} isDaylight={isDaylight} theme={theme} />
            </div>
        </div>
    </div>;
}
