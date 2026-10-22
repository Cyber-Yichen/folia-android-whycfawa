import SettingsRow, { SettingsToggle } from './SettingsRow';
import React from 'react';
import { Command } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { usePlayerChromeSettingsStore } from '../../../stores/usePlayerChromeSettingsStore';
import SettingsSectionHeading from './navigation/SettingsSectionHeading';

// src/components/modal/settings/CommandPaletteButtonSetting.tsx
// 底部命令面板按钮的自动隐藏开关。桌面版有 Ctrl+K、不渲染这个按钮，所以只在非桌面显示。

type CommandPaletteButtonSettingProps = {
    isDaylight: boolean;
    settingsCardClass: string;
    theme?: { secondaryColor?: string } | null;
};

const isElectronBuild = (): boolean => (
    typeof window !== 'undefined' && Boolean((window as unknown as { electron?: unknown }).electron)
);

const CommandPaletteButtonSetting: React.FC<CommandPaletteButtonSettingProps> = ({
    isDaylight,
    settingsCardClass,
    theme,
}) => {
    const { t } = useTranslation();
    const { autoHide, onToggle, hidden, setHidden } = usePlayerChromeSettingsStore(useShallow(state => ({
        autoHide: state.autoHideCommandPaletteButton,
        hidden: state.hideCommandPaletteButton,
        setHidden: state.handleToggleHideCommandPaletteButton,
        onToggle: state.handleToggleAutoHideCommandPaletteButton,
    })));

    if (isElectronBuild()) return null;

    const toggleOffBackgroundClass = isDaylight ? 'bg-zinc-200' : 'bg-[#2A2D35]';

    return (
        <div className="space-y-4">
            <SettingsSectionHeading icon={Command} label={t('options.commandPaletteButtonSection')} />
            <div className={`rounded-xl border overflow-hidden ${settingsCardClass}`}>
                <SettingsRow dividerClass={isDaylight ? 'border-zinc-200' : 'border-white/10'}
                    title={t('options.showCommandPaletteButton')}
                    control={<SettingsToggle ariaLabel={t('options.showCommandPaletteButton')} checked={!hidden}
                        onChange={() => setHidden(!hidden)} offClass={toggleOffBackgroundClass} onColor={theme?.secondaryColor} />} />
                <SettingsRow dividerClass="" isLast
                    title={t('options.commandPaletteButtonAutoHide')}
                    description={t('options.commandPaletteButtonAutoHideDesc')}
                    control={<SettingsToggle ariaLabel={t('options.commandPaletteButtonAutoHide')} checked={autoHide}
                        onChange={() => onToggle(!autoHide)} disabled={hidden}
                        offClass={toggleOffBackgroundClass} onColor={theme?.secondaryColor} />} />
            </div>
        </div>
    );
};

export default CommandPaletteButtonSetting;
