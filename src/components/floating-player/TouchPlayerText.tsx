import React, { useLayoutEffect, useRef } from 'react';

// Only overflowing text moves; measurements never enter the animation's frame loop.
export default function TouchPlayerText({ text, className, color }: { text: string; className: string; color?: string }) {
    const root = useRef<HTMLSpanElement>(null);
    const content = useRef<HTMLSpanElement>(null);
    useLayoutEffect(() => {
        const viewport = root.current;
        const label = content.current;
        if (!viewport || !label) return;
        const measure = () => {
            const distance = Math.max(0, label.scrollWidth - viewport.clientWidth);
            viewport.dataset.overflow = distance > 1 ? 'true' : 'false';
            viewport.style.setProperty('--touch-text-travel', (-distance) + 'px');
            viewport.style.setProperty('--touch-text-duration', Math.max(6, distance / 24 + 3) + 's');
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(viewport);
        observer.observe(label);
        return () => observer.disconnect();
    }, [text]);
    return <span ref={root} className={className + ' touch-player-text'} style={{ color }} title={text}>
        <span ref={content}>{text}</span>
    </span>;
}
