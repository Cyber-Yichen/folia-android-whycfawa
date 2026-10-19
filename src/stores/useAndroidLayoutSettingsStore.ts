import { isAndroidNativeRuntime } from '../utils/platform';
import { getStoredBoolean, setStoredBoolean } from './storagePrimitives';
import { create } from 'zustand';
import {
    applyAndroidPhoneFit,
    readStoredAndroidPhoneFitOrientation,
    readStoredAndroidPhoneFit,
    syncAndroidPhoneFitNative,
    writeStoredAndroidPhoneFitOrientation,
    writeStoredAndroidPhoneFit,
    type AndroidPhoneFitOrientation,
} from '../services/androidPhoneLayout';
import {
    applyKeepScreenOn,
    readStoredKeepScreenOn,
    writeStoredKeepScreenOn,
} from '../services/androidKeepScreenOn';

type AndroidLayoutSettingsState = {
    phoneFitEnabled: boolean;
    phoneFitOrientation: AndroidPhoneFitOrientation;
    immersiveModeEnabled: boolean;
    immersiveHideTransport: boolean;
    setImmersiveHideTransport: (enabled: boolean) => void;
    keepScreenOnEnabled: boolean;
    setPhoneFitEnabled: (enabled: boolean) => void;
    setPhoneFitOrientation: (orientation: AndroidPhoneFitOrientation) => void;
    setImmersiveModeEnabled: (enabled: boolean) => void;
    setKeepScreenOnEnabled: (enabled: boolean) => void;
};

export const IMMERSIVE_HIDE_TRANSPORT_KEY = 'folia_android_immersive_hide_transport';
const IMMERSIVE_STORAGE_KEY = 'folia_android_immersive_mode';

const readStoredImmersiveMode = (): boolean => {
    if (typeof window === 'undefined') return false;
    try {
        const saved = localStorage.getItem(IMMERSIVE_STORAGE_KEY);
        return saved === null ? isAndroidNativeRuntime() : saved === 'true';
    } catch {
        return false;
    }
};

const writeStoredImmersiveMode = (enabled: boolean): void => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(IMMERSIVE_STORAGE_KEY, enabled ? 'true' : 'false');
    } catch {
        // A storage failure must not make the switch unusable for the current session.
    }
};

export const useAndroidLayoutSettingsStore = create<AndroidLayoutSettingsState>((set, get) => ({
    phoneFitEnabled: readStoredAndroidPhoneFit(),
    phoneFitOrientation: readStoredAndroidPhoneFitOrientation(),
    immersiveModeEnabled: readStoredImmersiveMode(),
    immersiveHideTransport: getStoredBoolean(IMMERSIVE_HIDE_TRANSPORT_KEY, false),
    setImmersiveHideTransport: enabled => {
        setStoredBoolean(IMMERSIVE_HIDE_TRANSPORT_KEY, enabled);
        set({ immersiveHideTransport: enabled });
    },
    keepScreenOnEnabled: readStoredKeepScreenOn(),
    setPhoneFitEnabled: (enabled) => {
        writeStoredAndroidPhoneFit(enabled);
        applyAndroidPhoneFit(enabled, get().phoneFitOrientation);
        syncAndroidPhoneFitNative(enabled, get().phoneFitOrientation);
        set({ phoneFitEnabled: enabled });
    },
    setPhoneFitOrientation: (orientation) => {
        writeStoredAndroidPhoneFitOrientation(orientation);
        applyAndroidPhoneFit(get().phoneFitEnabled, orientation);
        syncAndroidPhoneFitNative(get().phoneFitEnabled, orientation);
        set({ phoneFitOrientation: orientation });
    },
    setImmersiveModeEnabled: (enabled) => {
        writeStoredImmersiveMode(enabled);
        set({ immersiveModeEnabled: enabled });
    },
    setKeepScreenOnEnabled: (enabled) => {
        writeStoredKeepScreenOn(enabled);
        applyKeepScreenOn(enabled);
        set({ keepScreenOnEnabled: enabled });
    },
}));
