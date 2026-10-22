import React, { useState } from 'react';
import { DAYLIGHT_THEME, DEFAULT_THEME } from '../../src/services/baseThemes';
import VisPlayground from '../../src/components/visualizer/VisPlayground';
import LoginQrStage from '../../src/components/login/LoginQrStage';
import type { VisualizerMode } from '../../src/types';
import type { ProbeDefinition } from './definition';

// dev/probes/androidAdaptation.probe.tsx
const Component = () => {
    const [mode, setMode] = useState<VisualizerMode>('classic');
    const [open, setOpen] = useState(true);
    const [phase, setPhase] = useState('waiting');
    const dark = new URLSearchParams(location.search).has('dark');
    const theme = dark ? DEFAULT_THEME : DAYLIGHT_THEME;
    return <div style={{ '--text-primary': theme.primaryColor, '--text-secondary': theme.secondaryColor } as React.CSSProperties}>
        <button onClick={() => setOpen(true)}>Open styles</button>
        <button onClick={() => setPhase('scanned')}>Scan</button>
        <button onClick={() => setPhase('confirmed')}>Confirm</button>
        <div style={{ width: 160, padding: 12, background: 'white' }}>
            <LoginQrStage src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAACgCAYAAACLz2ctAAAAAklEQVR4AewaftIAAARRSURBVO3BUW5cCQ4EwSyi73/lXH8LNKC3aoGSpyLiH1QdGaoODVWHhqpDQ9WhoerQi79Iwm+gsknCEyqbJGxUPisJ76CyScJvoPLRUHVoqDo0VB0aqg4NVYdePKRyIQlPqGySsEnCRmWThK9S2SThHVQuJOGzhqpDQ9WhoerQUHVoqDr04k2S8A4q75CEjcomCV+lsknCEyrfKQnvoPJVQ9WhoerQUHVoqDo0VB168Y9S2SThiSRsVL4qCRuV/4qh6tBQdWioOjRUHRqqDr2o/0sSvkplk4SNyr9mqDo0VB0aqg4NVYeGqkMv3kTlJ0nCd1L5rVR+iqHq0FB1aKg6NFQdGqoOvXgoCb+ZyiYJG5VNEj5S2SRho/KdkvDTDVWHhqpDQ9WhoerQUHXoxV+o/GYqmyRsVJ5Q+SlUfquh6tBQdWioOjRUHRqqDr34iyRsVDZJ2Ki8QxKeUHkiCRuVz0rCT5KEjcoTSdiobJKwUfloqDo0VB0aqg4NVYeGqkMv/kLlJ1H51yThHZKwUXkiCRuVTRK+aqg6NFQdGqoODVWHhqpD8Q8eSMJG5TslYaNyIQkfqTyRhI3Kd0rCO6hskrBR+WioOjRUHRqqDg1Vh4aqQy/+IgkblU0SnlDZJGGjsknCRmWThI3KJgmflYSNyhNJ2KhskrBReQeVJ1Q+a6g6NFQdGqoODVWHhqpDLx5KwndS2SThHVR+CpVNEr6TyndKwkblo6Hq0FB1aKg6NFQdin/wQBI2Kk8k4QmVJ5KwUdkkYaOyScJHKk8k4YLKOyThCZWPhqpDQ9WhoerQUHVoqDr04i+S8A5J2Kg8kYSNyjuofFUS3kFlk4QnVJ5IwhMqmyR81lB1aKg6NFQdGqoODVWHXvyFyhNJ2Kg8kYSNyiYJG5VNEr6LyiYJ30llk4R3UHlC5bOGqkND1aGh6tBQdWioOhT/YJGEJ1Q2SdioPJGEjcoTSdiofFUSfjOVJ5KwUfmsoerQUHVoqDo0VB0aqg7FP/gHJWGj8l2S8ITKJgkblXdIwkblHZKwUfloqDo0VB0aqg4NVYeGqkMv/iIJv4HKE0nYqGySsFH5SOVCEjYqP91QdWioOjRUHRqqDg1Vh148pHIhCU+oPJGEjcpnJWGjsknCO6hcSMJG5bOGqkND1aGh6tBQdWioOvTiTZLwDioXVDZJ+CmS8BskYaPy0VB1aKg6NFQdGqoODVWHXvzHJOEJlU0SPlJ5QmWThCdUnkjCE0l4QuWzhqpDQ9WhoerQUHVoqDr04h+VhI3KJglflYQnVDYq75CEJ5KwUdkkYZOEjcpHQ9WhoerQUHVoqDo0VB168SYqP4nKEyqbJHyWyiYJTyRho/KdVJ5Q+aqh6tBQdWioOjRUHRqqDr14KAm/QRI2KpskbFQ+KwlPJOEdkrBReSIJG5UnkrBR+WioOjRUHRqqDg1Vh4aqQ/EPqo4MVYeGqkND1aGh6tD/AFPspUoyP8EWAAAAAElFTkSuQmCC" phase={phase} />
        </div>
        {open && <VisPlayground isDaylight={!dark} theme={theme} visualizerMode={mode} onVisualizerModeChange={setMode}
            fontStyle="sans" fontScale={1} fontWeight={null} customFontFamily={null} customFontLabel={null}
            onFontStyleChange={() => {}} onFontScaleChange={() => {}} onFontWeightChange={() => {}}
            onCustomFontChange={() => {}} onClose={() => setOpen(false)} />}
    </div>;
};
export default { id: 'androidAdaptation', title: 'Android layout and QR states',
    description: 'Responsive style editor and shared login state animations.', Component } satisfies ProbeDefinition;
