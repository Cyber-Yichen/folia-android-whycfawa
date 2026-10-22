import { buildVisualSettingsConfig } from '../../../src/services/obs/visualSettingsConfig';
import { decompressConfig } from '../../../src/utils/appearanceCodec';
import { buildImportPlan } from '../../../src/utils/appearanceImportPlan';
import { applyPlaybackAppearanceConfig } from '../../../src/services/playbackAppearanceConfig';

// Adapter for upstream regressions against Android's existing import planner and settings actions.
export type ConfigThemeControls = Record<string, unknown>;
export const buildCurrentConfig = (_controls: ConfigThemeControls, _theme: string) => buildVisualSettingsConfig();
export const applyImportedConfig = (config: Record<string, unknown>, keys: string[], _controls: ConfigThemeControls) => applyPlaybackAppearanceConfig(config, keys);
export const planConfigImport = (text: string, _controls: ConfigThemeControls) => {
    const config = decompressConfig(text);
    return { config, plan: buildImportPlan({ incoming: config, current: buildVisualSettingsConfig(), switches: { isCustomThemePreferred: false, songThemeAutoSwitchEnabled: false, songThemeAutoGenerateEnabled: false }, customFontSource: null, customFontLabel: null, incomingFontAvailable: true }) };
};
