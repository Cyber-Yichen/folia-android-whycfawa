import React from 'react';
import type { Theme, VisualizerMode } from '../../types';
import { useFoliumRegistryEntries } from '../../mods/folium/registry';
import { visualizersRegistry } from '../../mods/folium/registries/visualizers';
import { colorWithAlpha } from './colorMix';
import { getVisualizerModeLabel, VISUALIZER_REGISTRY } from './registry';

// src/components/visualizer/VisPlaygroundStylePicker.tsx
// Static pictures keep style selection separate from the single live preview.
const pictures = import.meta.glob<string>('./style-previews/*.jpg', {
    eager: true, query: '?url', import: 'default',
});
type Props = {
    value: VisualizerMode;
    onChange?: (mode: VisualizerMode) => void;
    theme: Theme;
    t: (key: string) => string;
};
const VisPlaygroundStylePicker: React.FC<Props> = ({ value, onChange, theme, t }) => {
    useFoliumRegistryEntries(visualizersRegistry);
    return (
        <div className="shrink-0 min-w-0">
            <div className="mb-2 flex items-center gap-2 px-1 text-xs" style={{ color: theme.secondaryColor }}>
                <span>{t('options.lyricStyles')}</span>
                <span>{VISUALIZER_REGISTRY.length}</span>
            </div>
            <div className="overflow-x-auto overscroll-x-contain custom-scrollbar">
                <div className="vis-playground-styles" role="group" aria-label={t('options.visualizerMode')}>
                    {VISUALIZER_REGISTRY.map(entry => {
                        const chosen = entry.mode === value;
                        const label = getVisualizerModeLabel(entry.mode, t);
                        const picture = pictures['./style-previews/' + entry.mode + '.jpg'];
                        return (
                            <button
                                key={entry.mode}
                                type="button"
                                aria-pressed={chosen}
                                aria-label={label}
                                data-visualizer-style={entry.mode}
                                onClick={() => onChange?.(entry.mode)}
                                className="min-w-0 rounded-lg text-xs focus-visible:outline-2 focus-visible:outline-offset-2"
                                style={{ color: chosen ? theme.primaryColor : theme.secondaryColor, outlineColor: theme.accentColor }}
                            >
                                <span
                                    className="relative block aspect-[16/10] overflow-hidden rounded-lg border"
                                    style={{
                                        borderColor: chosen ? theme.accentColor : colorWithAlpha(theme.secondaryColor, 0.2),
                                        boxShadow: chosen ? '0 0 0 2px ' + colorWithAlpha(theme.accentColor, 0.45) : undefined,
                                        backgroundColor: theme.backgroundColor,
                                    }}
                                >
                                    {picture
                                        ? <img src={picture} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover" />
                                        : <span className="absolute inset-0 grid place-items-center px-1 font-medium">{label}</span>}
                                </span>
                                <span className={'mt-1.5 block truncate text-center ' + (chosen ? 'font-semibold' : '')}>{label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
export default VisPlaygroundStylePicker;
