import React, { useEffect, useState } from 'react';
import { motionValue } from 'framer-motion';
import FloatingPlayerControls from '../../src/components/FloatingPlayerControls';
import AndroidImmersiveSetting from '../../src/components/modal/settings/AndroidImmersiveSetting';
import { useImmersiveChromeReveal } from '../../src/hooks/useImmersiveChromeReveal';
import { useImmersiveChromeStore } from '../../src/stores/useImmersiveChromeStore';
import { useAndroidLayoutSettingsStore } from '../../src/stores/useAndroidLayoutSettingsStore';
import { useAppViewStore } from '../../src/stores/useAppViewStore';
import { PlayerState } from '../../src/types';
import { installAndroidPerformancePreference } from '../../src/services/androidPerformance';
import type { ProbeDefinition } from './definition';

// Real touch transport and visibility clocks, with observable action counters.
const time = motionValue(42);
function AndroidTouchPlayback() {
    const [next, setNext] = useState(0), [play, setPlay] = useState(0), [seek, setSeek] = useState(0);
    const hidden = useImmersiveChromeStore(state => state.immersiveChromeHidden);
    const enabled = useAndroidLayoutSettingsStore(state => state.immersiveModeEnabled);
    const hideTransport = useAndroidLayoutSettingsStore(state => state.immersiveHideTransport);
    useEffect(() => { useAppViewStore.setState({ view: 'player', isPanelOpen: false, isCommandFilterOpen: false }); return installAndroidPerformancePreference(); }, []);
    useImmersiveChromeReveal({ immersiveEnabled: enabled, isPlayerView: true, autoHidePlayerChrome: false, isPlaying: true });
    return <div className="h-screen bg-zinc-950 text-white" data-next={next} data-play={play} data-seek={seek}>
        <div className="max-w-xl p-4"><AndroidImmersiveSetting isDaylight={false} settingsCardClass="border-white/10" /></div>
        <button type="button" data-probe-back className="absolute left-6 top-44" style={{ visibility: hidden ? 'hidden' : 'visible' }}>Back</button>
        <FloatingPlayerControls currentSong={{ name: 'Red Sun' }} artistName="Hacken Lee" playerState={PlayerState.PLAYING}
            currentTime={time} duration={200} loopMode="all" currentView="player" audioSrc="probe://audio" canTogglePlay lyrics={null}
            onSeek={() => setSeek(value => value + 1)} onTogglePlay={() => setPlay(value => value + 1)} onToggleLoop={() => {}}
            onNavigateToPlayer={() => {}} isDaylight={false} isHidden={hidden && hideTransport}
            slotPrimary="loop" slotSecondary="lyrics-timeline" slotContext={{ onShuffle: () => {}, canShuffle: true, onLike: () => {}, isLiked: false, likeDisabled: false, invokeCommandById: () => {}, canInvokeCommandById: () => true }} onCommitBottomBarOffset={() => {}}
            trackNavigation={{ currentTrackKey: 'probe', canPrev: true, canNext: true, onPrev: () => {}, onNext: () => setNext(value => value + 1), prevTitle: 'Previous', nextTitle: 'Next', prevLabel: 'Previous track', nextLabel: 'Next track' }} />
    </div>;
}
export default { id: 'androidTouchPlayback', title: 'Android touch playback', description: 'Native transport and immersion', Component: AndroidTouchPlayback } satisfies ProbeDefinition;
