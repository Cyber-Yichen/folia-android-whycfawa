export type AiProviderPreset = { id: string; label: string; protocol: 'gemini' | 'openai' | 'anthropic'; baseUrl: string };
export const AI_PROVIDER_PRESETS: readonly AiProviderPreset[];
export const DEFAULT_GEMINI_MODEL: string;
export function getAiProviderPreset(settings?: { AI_PROVIDER?: string; AI_PROVIDER_PRESET?: string; OPENAI_API_URL?: string }): AiProviderPreset;
