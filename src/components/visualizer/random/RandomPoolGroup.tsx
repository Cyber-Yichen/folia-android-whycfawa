import React from 'react';
import { useTranslation } from 'react-i18next';
import { Shuffle } from 'lucide-react';
import { useRandomPool } from './useRandomPool';
import { VisualizerModeGlyph } from '../modeGlyphs';

// A lightweight multi-select pool; individual styles retain their saved appearance and tuning.
const RandomPoolGroup: React.FC = () => {
    const { t } = useTranslation();
    const pool = useRandomPool();
    return (
        <section className="rounded-2xl border border-current/10 p-4 space-y-4" aria-label={t('options.randomPool')}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-medium">{t('options.randomPool')} <small className="opacity-60">{pool.countLabel}</small></span>
                <button type="button" className="min-h-11 rounded-lg px-3 text-xs bg-current/5 disabled:opacity-40" disabled={pool.allOn} onClick={() => pool.selectAll()}>{t('options.randomVisualizerSelectAll')}</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
                {pool.options.map(option => {
                    const selected = pool.modes.includes(option.value);
                    return <button key={option.value} type="button" aria-pressed={selected}
                        className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border p-2 text-xs transition-colors"
                        style={{ borderColor: selected ? 'currentColor' : 'transparent', background: selected ? 'rgba(128,128,128,0.12)' : 'rgba(128,128,128,0.05)' }}
                        onClick={() => {
                            if (selected && pool.modes.length === 1) { pool.refuse(); return; }
                            pool.setModes(selected ? pool.modes.filter(mode => mode !== option.value) : [...pool.modes, option.value]);
                        }}><VisualizerModeGlyph mode={option.value} size={22} /><span>{option.label}</span></button>;
                })}
            </div>
            <div className="flex items-center justify-between gap-3 text-xs">
                <span>{t('options.randomVisualizerCurrentStyle')} · {pool.currentLabel}</span>
                <button type="button" aria-label={t('options.randomVisualizerReroll')} disabled={!pool.canReroll} onClick={pool.reroll} className="grid h-11 w-11 place-items-center rounded-full bg-current/5 disabled:opacity-40"><Shuffle size={18} /></button>
            </div>
        </section>
    );
};
export default RandomPoolGroup;
