import SettingsRow, { SettingsToggle } from './SettingsRow';
import React from 'react';
import { EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SettingsSectionHeading from './navigation/SettingsSectionHeading';
import { useAndroidLayoutSettingsStore } from '../../../stores/useAndroidLayoutSettingsStore';

// src/components/modal/settings/AndroidImmersiveSetting.tsx
// 「全沉浸模式」：单独一个类别，放在自适应屏幕分辨率下面。
// 打开时强制隐藏命令面板按钮；关闭时按钮回到 autoHide 决定的状态。
// 只有安卓容器渲染；桌面和网页版没有这个开关。

type AndroidImmersiveSettingProps = {
    isDaylight: boolean;
    settingsCardClass: string;
    theme?: { secondaryColor?: string } | null;
};

const isAndroidNativeRuntime = (): boolean => (
    typeof window !== 'undefined'
    && (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor?.getPlatform?.() === 'android'
);

const AndroidImmersiveSetting: React.FC<AndroidImmersiveSettingProps> = ({
    isDaylight,
    settingsCardClass,
    theme,
}) => {
    const { t } = useTranslation();
    const enabled = useAndroidLayoutSettingsStore(state => state.immersiveModeEnabled);
    const setEnabled = useAndroidLayoutSettingsStore(state => state.setImmersiveModeEnabled);

    const hideTransport = useAndroidLayoutSettingsStore(state => state.immersiveHideTransport);
    const setHideTransport = useAndroidLayoutSettingsStore(state => state.setImmersiveHideTransport);
    if (!isAndroidNativeRuntime()) return null;

    const toggleOffBackgroundClass = isDaylight ? 'bg-zinc-200' : 'bg-[#2A2D35]';

    return (
        <div className="space-y-4">
            <SettingsSectionHeading icon={EyeOff} label={t('options.immersiveMode')} />
            <div className={`rounded-xl border overflow-hidden ${settingsCardClass}`}>
                <SettingsRow title={t('options.immersiveMode')} description={t('options.immersiveModeDesc')}
                    dividerClass={isDaylight ? 'border-zinc-200' : 'border-white/10'}
                    control={<SettingsToggle ariaLabel={t('options.immersiveMode')} checked={enabled}
                        onChange={() => setEnabled(!enabled)} offClass={toggleOffBackgroundClass} onColor={theme?.secondaryColor} />} />
                <SettingsRow title={t('options.immersiveHideTransport')} dividerClass="" isLast
                    control={<SettingsToggle ariaLabel={t('options.immersiveHideTransport')} checked={hideTransport}
                        onChange={() => setHideTransport(!hideTransport)} disabled={!enabled}
                        offClass={toggleOffBackgroundClass} onColor={theme?.secondaryColor} />} />
            </div>
        </div>
    );
};

export default AndroidImmersiveSetting;
