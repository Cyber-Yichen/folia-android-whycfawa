import React from 'react';
import AiProviderSettings from '../../src/components/modal/settings/AiProviderSettings';
import type { ProbeDefinition } from './definition';

// Exercise native settings UI with browser-intercepted provider catalogues.
export default { id: 'androidAiSettings', title: 'Android AI settings', description: 'Preset and model selection', Component: () => <div className="min-h-screen bg-zinc-950 p-4 text-white"><AiProviderSettings settingsCardClass="border-white/10 max-w-lg" isDaylight={false} /></div> } satisfies ProbeDefinition;
