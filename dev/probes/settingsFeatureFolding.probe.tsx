import React from 'react';
import AiProviderSettings from '../../src/components/modal/settings/AiProviderSettings';
import StorageSettingsSection from '../../src/components/modal/settings/StorageSettingsSection';
import { useSettingsModalStore } from '../../src/stores/useSettingsModalStore';
import type { ProbeDefinition } from './definition';

// Real settings cards exercise disclosure, retained drafts and explicit configuration entry.
function SettingsFeatureFolding() {
    return <div className="min-h-screen bg-zinc-950 p-4 text-white">
        <div className="max-w-xl space-y-4">
            <button type="button" onClick={() => useSettingsModalStore.getState().openSettings('options', 'appearance', null, 'aiProvider')}>Open AI settings</button>
            <AiProviderSettings settingsCardClass="border-white/10" isDaylight={false} />
            <StorageSettingsSection cacheDirectory="" cacheDirectoryIsDefault cacheDirectoryStatus="idle"
                cacheSizes={{ playlist: '0 B', lyrics: '0 B', cover: '0 B', media: '0 B', analysis: '0 B' }}
                enableMediaCache errorTextColor="text-red-400" isCleaning={null} isElectron={false}
                mediaCacheLimitGb={5} mediaCount={0} onChooseCacheDirectory={() => {}}
                onClear={() => {}} onClearAll={() => {}} onSetMediaCacheLimitGb={() => {}} onToggleMediaCache={() => {}}
                settingsCardClass="border-white/10" toggleOffBackgroundClass="bg-white/10" />
        </div>
    </div>;
}
export default { id: 'settingsFeatureFolding', title: 'Settings feature folding', description: 'AI and sync disclosure', Component: SettingsFeatureFolding } satisfies ProbeDefinition;
