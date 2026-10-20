import { useTouchPlayerSettingsStore } from '../stores/useTouchPlayerSettingsStore';
import { useVisualizerSettingsStore } from '../stores/useVisualizerSettingsStore';
import { useStageSettingsStore } from '../stores/useStageSettingsStore';
import type { VisualizerMode } from '../types';
import { normalizeNowPlayingCardPosition } from '../utils/nowPlayingCardPosition';

// Shared selective restore for playback appearance fields added after the Android settings fork.
export const applyPlaybackAppearanceConfig = (config: Record<string, unknown>, picked: readonly string[]) => {
    const has = (key: string) => picked.includes(key) && Object.prototype.hasOwnProperty.call(config, key);
    if (has('touchPlayerBar')) useTouchPlayerSettingsStore.getState().setAppearance(config.touchPlayerBar);
    const visualizer = useVisualizerSettingsStore.getState();
    if (has('visualizerMode') && typeof config.visualizerMode === 'string' && config.visualizerMode) visualizer.handleSetVisualizerMode(config.visualizerMode, { preserveRandom: true });
    if (has('randomVisualizerModes')) visualizer.handleSetRandomVisualizerModes(Array.isArray(config.randomVisualizerModes) ? config.randomVisualizerModes as VisualizerMode[] : []);
    if (has('randomVisualizerModePerSong')) visualizer.handleToggleRandomVisualizerModePerSong(Boolean(config.randomVisualizerModePerSong));
    if (has('stageTrackPillPosition')) useStageSettingsStore.getState().handleSetStageTrackPillPosition(normalizeNowPlayingCardPosition(config.stageTrackPillPosition));
};
