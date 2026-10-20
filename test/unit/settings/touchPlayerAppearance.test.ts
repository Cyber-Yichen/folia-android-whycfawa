// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { normalizeTouchPlayerBarAppearance } from '@/utils/touchPlayerBarAppearance';
import { useTouchPlayerSettingsStore } from '@/stores/useTouchPlayerSettingsStore';
import { buildVisualSettingsConfig } from '@/services/obs/visualSettingsConfig';
import { compressConfig, decompressConfig } from '@/utils/appearanceCodec';
import { applyPlaybackAppearanceConfig } from '@/services/playbackAppearanceConfig';
import { buildImportPlan } from '@/utils/appearanceImportPlan';

// Appearance survives persistence and selective visual-config transfer without accepting invalid variants.
beforeEach(() => useTouchPlayerSettingsStore.getState().setAppearance(null));
describe('touch player appearance', () => {
    it('defaults to cover and horizontal expansion and rejects malformed choices', () => {
        expect(normalizeTouchPlayerBarAppearance(null)).toEqual({ compactStyle: 'cover', expansion: 'wide' });
        expect(normalizeTouchPlayerBarAppearance({ compactStyle: 'unknown', expansion: [] })).toEqual({ compactStyle: 'cover', expansion: 'wide' });
    });
    it.each(['cover', 'text', 'progress'])('persists and round-trips %s with vertical expansion', compactStyle => {
        const appearance = { compactStyle, expansion: 'tall' };
        useTouchPlayerSettingsStore.getState().setAppearance(appearance);
        expect(JSON.parse(localStorage.getItem('touch_player_bar_appearance')!)).toEqual(appearance);
        expect(decompressConfig(compressConfig(buildVisualSettingsConfig())).touchPlayerBar).toEqual(appearance);
    });
    it('restores only selected fields and accepts a minified payload with no other fields', () => {
        const incoming = decompressConfig(compressConfig({ touchPlayerBar: { compactStyle: 'progress', expansion: 'tall' } }));
        applyPlaybackAppearanceConfig(incoming, []);
        expect(useTouchPlayerSettingsStore.getState().appearance.compactStyle).toBe('cover');
        applyPlaybackAppearanceConfig(incoming, ['touchPlayerBar']);
        expect(useTouchPlayerSettingsStore.getState().appearance).toEqual(incoming.touchPlayerBar);
    });
    it('normalizes raw imports and offers the appearance bundle in the import planner', () => {
        const config = decompressConfig(JSON.stringify({ touchPlayerBar: { compactStyle: 'text', expansion: 'invalid' } }));
        expect(config.touchPlayerBar).toEqual({ compactStyle: 'text', expansion: 'wide' });
        const plan = buildImportPlan({ incoming: config, current: buildVisualSettingsConfig(),
            switches: { isCustomThemePreferred: false, songThemeAutoSwitchEnabled: false, songThemeAutoGenerateEnabled: false } });
        expect(plan.changes.find(change => change.key === 'touchPlayerBar')?.group).toBe('trackCard');
    });
});
