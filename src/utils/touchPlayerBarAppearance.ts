import type { TouchPlayerBarAppearance } from '../types/touchPlayerBar';

// Persisted touch-player appearance is validated at both storage and import boundaries.
export const normalizeTouchPlayerBarAppearance = (value: unknown): TouchPlayerBarAppearance => {
    const object = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    return {
        compactStyle: object.compactStyle === 'text' || object.compactStyle === 'progress' ? object.compactStyle : 'cover',
        expansion: object.expansion === 'tall' ? 'tall' : 'wide',
    };
};
