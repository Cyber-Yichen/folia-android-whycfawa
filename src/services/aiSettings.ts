// src/services/aiSettings.ts
// 移动端（Capacitor）没有 Electron 主进程，AI 凭据只能存在渲染层。
// 桌面版走的是主进程 store；这里用 localStorage 提供同一组字段，
// 让共享的请求逻辑（shared/lyricSegmentationService.mjs 等）可以照常复用。

import { getAiProviderPreset, DEFAULT_GEMINI_MODEL } from '../../shared/aiProviderPresets.mjs';

export type AiProviderId = 'gemini' | 'openai';

export interface AiSettings {
    provider: AiProviderId;
    preset: string;
    apiProtocol: 'openai' | 'anthropic';
    geminiModel: string;
    geminiApiKey: string;
    openaiApiUrl: string;
    openaiApiKey: string;
    openaiApiModel: string;
    openaiApiTemperature: string;
    openaiApiStream: boolean;
}

const STORAGE_KEY = 'foliaAiProviderSettings';
export const AI_SETTINGS_CHANGED_EVENT = 'folia-ai-settings-changed';

export const DEFAULT_AI_SETTINGS: AiSettings = {
    provider: 'gemini',
    preset: 'gemini',
    apiProtocol: 'openai',
    geminiModel: DEFAULT_GEMINI_MODEL,
    geminiApiKey: '',
    openaiApiUrl: '',
    openaiApiKey: '',
    openaiApiModel: '',
    openaiApiTemperature: '0.7',
    openaiApiStream: false,
};

const normalizeProvider = (value: unknown): AiProviderId => (value === 'openai' ? 'openai' : 'gemini');

const asText = (value: unknown, fallback = ''): string => (
    typeof value === 'string' ? value : value === undefined || value === null ? fallback : String(value)
);

export const readAiSettings = (): AiSettings => {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_AI_SETTINGS };
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...DEFAULT_AI_SETTINGS };
        const parsed = JSON.parse(raw) as Partial<AiSettings> | null;
        if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_AI_SETTINGS };
        const preset = getAiProviderPreset({ AI_PROVIDER: normalizeProvider(parsed.provider), AI_PROVIDER_PRESET: parsed.preset, OPENAI_API_URL: parsed.openaiApiUrl });
        return {
            provider: normalizeProvider(parsed.provider),
            preset: preset.id,
            apiProtocol: preset.protocol === 'anthropic' ? 'anthropic' : 'openai',
            geminiModel: /^[\w.-]+$/.test(parsed.geminiModel ?? '') ? parsed.geminiModel! : DEFAULT_GEMINI_MODEL,
            geminiApiKey: asText(parsed.geminiApiKey),
            openaiApiUrl: asText(parsed.openaiApiUrl),
            openaiApiKey: asText(parsed.openaiApiKey),
            openaiApiModel: asText(parsed.openaiApiModel),
            openaiApiTemperature: asText(parsed.openaiApiTemperature, DEFAULT_AI_SETTINGS.openaiApiTemperature),
            openaiApiStream: parsed.openaiApiStream === true,
        };
    } catch {
        return { ...DEFAULT_AI_SETTINGS };
    }
};

export const writeAiSettings = (patch: Partial<AiSettings>): AiSettings => {
    const next: AiSettings = { ...readAiSettings(), ...patch };
    if (typeof localStorage !== 'undefined') {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
            // Quota or private mode: keep the in-memory value for this session.
        }
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(AI_SETTINGS_CHANGED_EVENT, { detail: next }));
    }
    return next;
};

/** 当前配置能不能真的发请求：选中的 provider 必须有对应凭据。 */
export const isAiConfigured = (settings: AiSettings = readAiSettings()): boolean => (
    settings.provider === 'openai'
        ? Boolean(settings.openaiApiKey.trim())
        : Boolean(settings.geminiApiKey.trim())
);

/** 共享的歌词分词服务读的是 env 形状，这里把表单字段映射过去。 */
export const buildAiEnv = (settings: AiSettings = readAiSettings()): Record<string, string | undefined> => ({
    AI_PROVIDER: settings.provider,
    GEMINI_API_KEY: settings.geminiApiKey.trim() || undefined,
    OPENAI_API_URL: settings.openaiApiUrl.trim() || undefined,
    OPENAI_API_KEY: settings.openaiApiKey.trim() || undefined,
    OPENAI_API_MODEL: settings.openaiApiModel.trim() || undefined,
    OPENAI_API_TEMPERATURE: settings.openaiApiTemperature,
});
