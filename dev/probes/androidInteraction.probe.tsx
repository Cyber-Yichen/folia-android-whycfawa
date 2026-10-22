import React, { useState } from 'react';
import { CustomSelect } from '../../src/components/shared/CustomSelect';
import BravaisListPanel from '../../src/library/suites/bravais/BravaisListPanel';
import type { BravaisLayer } from '../../src/library/suites/bravais/bravaisLayer';
import { useBravaisUiStore } from '../../src/library/suites/bravais/bravaisUiStore';
import '../../src/library/suites/bravais/bravaisCollection.css';
import type { ProbeDefinition } from './definition';

// Real native list actions and portaled menus, with deterministic content and observable counters.
const Component = () => {
    const [played, setPlayed] = useState(0), [located, setLocated] = useState(0);
    const [field, setField] = useState('title'), [value, setValue] = useState('0');
    const linked = useBravaisUiStore(state => state.linkedKey);
    const layer: BravaisLayer = {
        key: 'probe', sessionKey: 'probe', surface: 'collection', mode: 'infinite', isInteractive: true,
        focusedEntryKey: null, nowPlayingKey: null, queuedKeys: new Set(),
        items: Array.from({ length: 40 }, (_, i) => ({
            key: 'song:' + i, kind: i === 2 ? 'album' as const : 'track' as const, title: 'Track ' + i, subtitle: 'Artist',
            badge: String(i + 1), durationLabel: '03:20', unavailable: i === 1,
        })),
        seam: { title: 'Collection', crumb: 'Collection', meta: '40 tracks' },
        entries: {
            hasPanel: true, panelTitle: 'Sort tracks', listCrumb: 'List', hasQuery: false, hasForm: false,
            sort: { field, fields: [{ value: 'title', label: 'Title' }, { value: 'artist', label: 'Artist' }],
                direction: 'asc', directionLabel: 'Sort direction', setField, toggleDirection: () => {} },
        },
    };
    return <main className="h-screen bg-zinc-950 text-white" data-played={played} data-located={located} data-linked={linked ?? ''}>
        <div className="p-3" data-probe-select>
            <CustomSelect value={value} onChange={setValue} ariaLabel="Long menu" size="compact"
                options={Array.from({ length: 100 }, (_, i) => ({ value: String(i), label: 'Choice ' + i }))} />
            <input className="mt-2 border" aria-label="Keyboard input" />
        </div>
        <div className="bravais-seam" style={{ height: 'calc(100% - 120px)' }}>
            <BravaisListPanel layer={layer} depth={1} actions={{
                close: () => {}, fold: () => {}, locate: () => setLocated(n => n + 1), play: () => setPlayed(n => n + 1),
            }} />
        </div>
    </main>;
};
export default { id: 'androidInteraction', title: 'Android list and menus', description: 'Touch actions and visible viewport positioning', Component } satisfies ProbeDefinition;
