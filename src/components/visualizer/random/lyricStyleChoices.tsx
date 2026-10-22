import { useVisualizerSettingsStore } from '../../../stores/useVisualizerSettingsStore';
import type { VisualizerMode } from '../../../types';

// Random is a picker choice; renderers always receive the actual style selected for this song.
export const RANDOM_VISUALIZER_CHOICE = '__random__';
export const selectLyricStyleChoice = (mode: VisualizerMode, select: (mode: VisualizerMode) => void, notify = true) => {
    if (mode === RANDOM_VISUALIZER_CHOICE) {
        useVisualizerSettingsStore.getState().handleToggleRandomVisualizerModePerSong(true, { notify });
    } else {
        useVisualizerSettingsStore.getState().handleToggleRandomVisualizerModePerSong(false, { notify: false });
        select(mode);
    }
};
