import React, { useLayoutEffect, useRef } from 'react';

// The visual rail follows the capsule's lower contour; ProgressBar continues to own seeking.
export default function TouchPlayerEdgeProgress({ progressPathRef, initialProgress, color }: {
    progressPathRef: React.RefObject<SVGPathElement | null>; initialProgress: number; color: string;
}) {
    const initialOffset = useRef(Number.isFinite(initialProgress) ? 1 - Math.max(0, Math.min(1, initialProgress)) : 1);
    const svg = useRef<SVGSVGElement>(null);
    const track = useRef<SVGPathElement>(null);
    useLayoutEffect(() => {
        const element = svg.current;
        if (!element) return;
        const measure = () => {
            const width = element.clientWidth, height = element.clientHeight;
            if (!width || !height) return;
            const radius = Math.max(0, Math.min(29, height / 2 - 1, width / 2 - 1));
            const bottom = height - 1;
            const path = 'M1 ' + (bottom - radius) + ' A' + radius + ' ' + radius + ' 0 0 0 ' +
                (radius + 1) + ' ' + bottom + ' H' + (width - radius - 1) + ' A' + radius + ' ' +
                radius + ' 0 0 0 ' + (width - 1) + ' ' + (bottom - radius);
            element.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
            track.current?.setAttribute('d', path);
            progressPathRef.current?.setAttribute('d', path);
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        return () => observer.disconnect();
    }, [progressPathRef]);
    return <svg ref={svg} className="touch-player-edge" aria-hidden="true" fill="none" style={{ color }}>
        <path ref={track} stroke="currentColor" strokeWidth="2" opacity=".18" />
        <path ref={progressPathRef} stroke="currentColor" strokeWidth="2" pathLength="1" strokeDasharray="1"
            strokeLinecap="round" style={{ strokeDashoffset: initialOffset.current }} />
    </svg>;
}
