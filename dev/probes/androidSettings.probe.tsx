import React from 'react';
import { InteractionSettingsSubview } from '../../src/components/modal/settings/InteractionSettingsSubview';
import LabSettingsModal from '../../src/components/modal/settings/LabSettingsModal';
import { DAYLIGHT_THEME } from '../../src/services/baseThemes';
import type { ProbeDefinition } from './definition';

// dev/probes/androidSettings.probe.tsx
const Component = () => <div style={{ padding: 20, color: '#1c1917', background: '#f5f5f4' }}>
    <InteractionSettingsSubview isDaylight settingsCardClass="bg-white" theme={DAYLIGHT_THEME} />
    <LabSettingsModal isOpen embedded theme={DAYLIGHT_THEME} onClose={() => {}} />
</div>;
export default { id: 'androidSettings', title: 'Android setting visibility',
    description: 'Platform-specific controls follow the actual Capacitor runtime.', Component } satisfies ProbeDefinition;
