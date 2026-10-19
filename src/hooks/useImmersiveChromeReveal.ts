import { useEffect } from 'react';
import { useImmersiveChromeStore } from '../stores/useImmersiveChromeStore';
import { useAndroidLayoutSettingsStore } from '../stores/useAndroidLayoutSettingsStore';
import { useAppViewStore } from '../stores/useAppViewStore';
import { useSettingsModalStore } from '../stores/useSettingsModalStore';
import { isAndroidNativeRuntime } from '../utils/platform';

// src/hooks/useImmersiveChromeReveal.ts
// Native playback enters immersion ten seconds after transport disclosure closes.
export const IMMERSIVE_AUTO_HIDE_DELAY_MS = 10000;
type Options = {
    immersiveEnabled: boolean;
    isPlayerView: boolean;
    autoHidePlayerChrome: boolean;
    isPlaying?: boolean;
};
export const useImmersiveChromeReveal = ({ immersiveEnabled, isPlayerView, isPlaying = true }: Options): void => {
    const expanded = useImmersiveChromeStore(state => state.playerBarExpanded);
    const hidden = useImmersiveChromeStore(state => state.immersiveChromeHidden);
    const setHidden = useImmersiveChromeStore(state => state.setImmersiveChromeHidden);
    const hideTransport = useAndroidLayoutSettingsStore(state => state.immersiveHideTransport);
    const settingsOpen = useSettingsModalStore(state => state.settingsModalState.isOpen || state.isSubSettingsViewOpen);
    const panelOpen = useAppViewStore(state => state.isPanelOpen || state.isCommandFilterOpen);
    useEffect(() => {
        if (!isAndroidNativeRuntime()) return;
        const root = document.documentElement;
        root.dataset.foliaAndroidImmersive = hidden && immersiveEnabled && isPlayerView ? 'hidden' : 'visible';
        root.dataset.foliaAndroidHideTransport = String(hideTransport);
    }, [hidden, hideTransport, immersiveEnabled, isPlayerView]);
    useEffect(() => {
        let timer: number | undefined;
        const contacts = new Set<number>();
        const clear = () => { window.clearTimeout(timer); timer = undefined; };
        const schedule = () => {
            clear();
            if (expanded || contacts.size) return;
            timer = window.setTimeout(() => setHidden(true), IMMERSIVE_AUTO_HIDE_DELAY_MS);
        };
        setHidden(false);
        if (!isAndroidNativeRuntime() || !immersiveEnabled || !isPlayerView || !isPlaying || settingsOpen || panelOpen) return clear;
        const reveal = () => { setHidden(false); schedule(); };
        const down = (event: PointerEvent) => {
            contacts.add(event.pointerId); clear(); setHidden(false);
        };
        const up = (event: PointerEvent) => { contacts.delete(event.pointerId); schedule(); };
        window.addEventListener('pointerdown', down, true);
        window.addEventListener('pointerup', up, true);
        window.addEventListener('pointercancel', up, true);
        window.addEventListener('keydown', reveal);
        window.addEventListener('wheel', reveal, { passive: true });
        schedule();
        return () => {
            clear();
            window.removeEventListener('pointerdown', down, true);
            window.removeEventListener('pointerup', up, true);
            window.removeEventListener('pointercancel', up, true);
            window.removeEventListener('keydown', reveal);
            window.removeEventListener('wheel', reveal);
        };
    }, [expanded, immersiveEnabled, isPlayerView, isPlaying, panelOpen, settingsOpen, setHidden]);
};
export default useImmersiveChromeReveal;
