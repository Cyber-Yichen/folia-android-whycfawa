import { create } from 'zustand';
import { getStoredString, setStoredString } from './storagePrimitives';
import { normalizeTouchPlayerBarAppearance } from '../utils/touchPlayerBarAppearance';
import type { TouchPlayerBarAppearance } from '../types/touchPlayerBar';

// Touch-player appearance shares one validated shape with visual configuration transfer.
const TOUCH_PLAYER_BAR_STORAGE_KEY = 'touch_player_bar_appearance';
const readAppearance = () => {
    try {
        return normalizeTouchPlayerBarAppearance(JSON.parse(getStoredString(TOUCH_PLAYER_BAR_STORAGE_KEY, '{}')));
    } catch {
        return normalizeTouchPlayerBarAppearance(null);
    }
};
export const useTouchPlayerSettingsStore = create<{
    appearance: TouchPlayerBarAppearance;
    setAppearance: (appearance: unknown) => void;
}>(set => ({
    appearance: readAppearance(),
    setAppearance: value => {
        const appearance = normalizeTouchPlayerBarAppearance(value);
        setStoredString(TOUCH_PLAYER_BAR_STORAGE_KEY, JSON.stringify(appearance));
        set({ appearance });
    },
}));
