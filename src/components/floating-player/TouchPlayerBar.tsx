import React, { useRef } from 'react';
import { AudioLines, ChevronDown, Disc3, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { FloatingPlayerControlsProps } from '../FloatingPlayerControls';
import { PlayerState } from '../../types';
import type { PlayerControlSlotContext } from './playerControlSlotActions';
import PlayerControlSlotButton from './PlayerControlSlotButton';
import ProgressBar from '../ProgressBar';
import './TouchPlayerBar.css';
import TouchPlayerText from './TouchPlayerText';
import type { TouchPlayerBarAppearance } from '../../types/touchPlayerBar';
import TouchPlayerEdgeProgress from './TouchPlayerEdgeProgress';

// src/components/floating-player/TouchPlayerBar.tsx
// Compact transport remains usable; disclosure only adds controls rather than hiding basic actions.
type TouchPlayerBarProps = Pick<FloatingPlayerControlsProps,
    'currentSong' | 'artistName' | 'coverUrl' | 'playerState' | 'currentTime' | 'duration' |
    'onSeek' | 'onTogglePlay' | 'canTogglePlay' | 'controlsDisabled' | 'trackNavigation' |
    'slotPrimary' | 'slotSecondary' | 'primaryColor' | 'secondaryColor' | 'isDaylight'> & {
    expanded: boolean;
    appearance: TouchPlayerBarAppearance;
    onNowPlaying: () => void;
    onExpand: () => void;
    onCollapse: () => void;
    onSeekStart: () => void;
    onSeekEnd: () => void;
    slotContext: PlayerControlSlotContext;
};
export default function TouchPlayerBar({
    currentSong, artistName, coverUrl, playerState, currentTime, duration, onSeek, onTogglePlay,
    canTogglePlay, controlsDisabled, trackNavigation, slotPrimary, slotSecondary, slotContext,
    primaryColor = 'var(--text-primary)', secondaryColor = 'var(--text-secondary)', isDaylight,
    expanded, appearance, onNowPlaying, onExpand, onCollapse, onSeekStart, onSeekEnd,
}: TouchPlayerBarProps) {
    const { t } = useTranslation();
    const progressPathRef = useRef<SVGPathElement>(null);
    const playing = playerState === PlayerState.PLAYING;
    const action = (run: (() => void) | undefined) => (event: React.MouseEvent) => {
        event.stopPropagation();
        run?.();
    };
    const play = <button type="button" data-folia-player-bar-play
        className="touch-player-action is-play" disabled={!canTogglePlay || controlsDisabled}
        aria-label={t(playing ? 'player.pause' : 'player.play')} onClick={action(onTogglePlay)}>
        {playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
    </button>;
    const next = <button type="button" className="touch-player-action" data-touch-player-next
        disabled={!trackNavigation?.canNext || controlsDisabled}
        aria-label={trackNavigation?.nextLabel ?? t('options.playerControlsNext')}
        onClick={action(trackNavigation?.onNext)}><SkipForward size={26} fill="currentColor" /></button>;
    const progressOnly = !expanded && appearance.compactStyle === 'progress';
    return <div className="touch-player-bar" data-progress-only={progressOnly} style={{ color: primaryColor }}>
        {!progressOnly && <div className="touch-player-heading">
            <button type="button" className="touch-player-identity" disabled={controlsDisabled} aria-expanded={expanded}
                aria-label={t('options.playerControlsExpand')} onClick={action(onExpand)}>
                {(expanded || appearance.compactStyle === 'cover') && <span className="touch-player-cover">
                    <Disc3 size={24} aria-hidden />
                    {coverUrl && <img key={coverUrl} src={coverUrl} alt="" draggable={false}
                        onError={event => { event.currentTarget.style.visibility = 'hidden'; }} />}
                </span>}
                <span className="touch-player-copy">
                    <TouchPlayerText className="touch-player-title" text={currentSong?.name ?? ''} />
                    {artistName && <TouchPlayerText className="touch-player-artist" text={artistName} color={secondaryColor} />}
                </span>
            </button>
            {expanded && <button type="button" className="touch-player-action touch-player-now-playing"
                aria-label={t('options.touchPlayerNowPlaying')} title={t('options.touchPlayerNowPlaying')}
                disabled={controlsDisabled} onClick={action(onNowPlaying)}><AudioLines size={24} strokeWidth={1.75} /></button>}
            {expanded ? <button type="button" className="touch-player-action touch-player-collapse" aria-label={t('options.playerControlsCollapse')}
                disabled={controlsDisabled} onClick={action(onCollapse)}><ChevronDown size={24} /></button> : <div className="touch-player-compact-actions">{play}{next}</div>}
        </div>}
        {expanded && <div className="touch-player-transport">
            <PlayerControlSlotButton actionId={slotPrimary} context={slotContext} primaryColor={primaryColor}
                isDaylight={isDaylight} controlsDisabled={controlsDisabled} className="touch-player-action is-secondary" />
            <button type="button" className="touch-player-action" data-touch-player-prev
                disabled={!trackNavigation?.canPrev || controlsDisabled}
                aria-label={trackNavigation?.prevLabel ?? t('options.playerControlsPrevious')}
                onClick={action(trackNavigation?.onPrev)}><SkipBack size={26} fill="currentColor" /></button>
            {play}{next}
            <PlayerControlSlotButton actionId={slotSecondary} context={slotContext} primaryColor={primaryColor}
                isDaylight={isDaylight} controlsDisabled={controlsDisabled} className="touch-player-action is-secondary" />
        </div>}
        {progressOnly && <button type="button" className="touch-player-progress-disclosure"
            aria-label={t('options.playerControlsExpand')} disabled={controlsDisabled} onClick={action(onExpand)} />}
        {!progressOnly && <TouchPlayerEdgeProgress progressPathRef={progressPathRef} initialProgress={duration > 0 ? currentTime.get() / duration : 0} color={primaryColor} />}
        <div className={expanded ? 'touch-player-progress' : 'touch-player-progress is-compact'}
            data-folia-player-bar-progress onClick={event => event.stopPropagation()}>
            <ProgressBar currentTime={currentTime} duration={duration} onSeek={onSeek}
                onSeekStart={onSeekStart} onSeekEnd={onSeekEnd} disabled={controlsDisabled || !canTogglePlay}
                primaryColor={primaryColor} secondaryColor={secondaryColor} collapsed={!expanded} ariaLabel={t('ui.seek')} progressPathRef={progressPathRef} />
        </div>
    </div>;
}
