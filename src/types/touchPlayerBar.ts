// Appearance choices shared by touch transport, settings and configuration transfer.
export type TouchPlayerCompactStyle = 'cover' | 'text' | 'progress';
export type TouchPlayerExpansion = 'wide' | 'tall';
export interface TouchPlayerBarAppearance {
    compactStyle: TouchPlayerCompactStyle;
    expansion: TouchPlayerExpansion;
}
