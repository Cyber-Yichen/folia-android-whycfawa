import React from 'react';
import { ChevronDown, Disc3, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { FloatingPlayerControlsProps } from '../FloatingPlayerControls';
import { PlayerState } from '../../types';
import type { PlayerControlSlotContext } from './playerControlSlotActions';
import PlayerControlSlotButton from './PlayerControlSlotButton';
import ProgressBar from '../ProgressBar';
import './TouchPlayerBar.css';

// src/components/floating-player/TouchPlayerBar.tsx
// Compact transport remains usable; disclosure only adds controls rather than hiding basic actions.
type TouchPlayerBarProps = Pick<FloatingPlayerControlsProps,
    'currentSong' | 'artistName' | 'coverUrl' | 'playerState' | 'currentTime' | 'duration' |
    'onSeek' | 'onTogglePlay' | 'canTogglePlay' | 'controlsDisabled' | 'trackNavigation' |
    'slotPrimary' | 'slotSecondary' | 'primaryColor' | 'secondaryColor' | 'isDaylight'> & {
    expanded: boolean;
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
    expanded, onExpand, onCollapse, onSeekStart, onSeekEnd,
}: TouchPlayerBarProps) {
    const { t } = useTranslation();
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
    return <div className="touch-player-bar" style={{ color: primaryColor }}>
        <div className="touch-player-heading">
            <button type="button" className="touch-player-identity" aria-expanded={expanded}
                aria-label={t('options.playerControlsExpand')} onClick={action(onExpand)}>
                <span className="touch-player-cover">
                    <Disc3 size={24} aria-hidden />
                    {coverUrl && <img key={coverUrl} src={coverUrl} alt="" draggable={false}
                        onError={event => { event.currentTarget.style.visibility = 'hidden'; }} />}
                </span>
                <span className="touch-player-copy">
                    <span className="touch-player-title">{currentSong?.name ?? ''}</span>
                    {artistName && <span className="touch-player-artist" style={{ color: secondaryColor }}>{artistName}</span>}
                </span>
            </button>
            {expanded ? <button type="button" className="touch-player-action" aria-label={t('options.playerControlsCollapse')}
                onClick={action(onCollapse)}><ChevronDown size={24} /></button> : <div className="touch-player-compact-actions">{play}{next}</div>}
        </div>
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
        <div className={expanded ? 'touch-player-progress' : 'touch-player-progress is-compact'}
            data-folia-player-bar-progress onClick={event => event.stopPropagation()}>
            <ProgressBar currentTime={currentTime} duration={duration} onSeek={onSeek}
                onSeekStart={onSeekStart} onSeekEnd={onSeekEnd} disabled={controlsDisabled || !canTogglePlay}
                primaryColor={primaryColor} secondaryColor={secondaryColor} collapsed={!expanded} />
        </div>
    </div>;
}
