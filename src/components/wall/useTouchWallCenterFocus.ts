import { useEffect, useRef, useState, type RefObject } from 'react';
import { isAndroidNativeRuntime } from '../../utils/platform';

// Camera writes schedule one hit test; only a change of the centred tile enters React state.
export const useTouchWallCenterFocus = (containerRef: RefObject<HTMLDivElement | null>): string | null => {
    const [focused, setFocused] = useState<string | null>(null);
    const focusedRef = useRef<string | null>(null);
    useEffect(() => {
        const container = containerRef.current;
        if (!container || !isAndroidNativeRuntime()) return;
        let frame: number | null = null, selected: HTMLElement | null = null;
        const update = () => {
            frame = null;
            const rect = container.getBoundingClientRect();
            const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
            let next: HTMLElement | null = null, distance = Infinity;
            for (const dx of [0, -64, 64, -128, 128]) {
                for (const element of document.elementsFromPoint(cx + dx, cy)) {
                    const tile = element.closest<HTMLElement>('.bravais-tile, .lattice-poster[data-instance-id]');
                    if (!tile || !container.contains(tile) || tile.querySelector('.is-wall, .is-window')) continue;
                    const box = tile.getBoundingClientRect();
                    const d = Math.hypot(box.left + box.width / 2 - cx, box.top + box.height / 2 - cy);
                    if (d < distance) { distance = d; next = tile; }
                    break;
                }
                if (dx === 0 && next) break;
            }
            if (selected !== next) {
                selected?.removeAttribute('data-touch-center');
                selected = next;
                selected?.setAttribute('data-touch-center', 'true');
            }
            const id = next?.dataset.instanceId ?? null;
            if (id !== focusedRef.current) { focusedRef.current = id; setFocused(id); }
        };
        const schedule = () => { if (frame === null) frame = requestAnimationFrame(update); };
        const mutations = new MutationObserver(records => {
            if (records.some(record => record.type === 'childList' || (record.target instanceof Element && record.target.classList.contains('lattice-world')))) schedule();
        });
        mutations.observe(container, { subtree: true, childList: true });
        container.querySelectorAll('.lattice-world').forEach(world => mutations.observe(world, { attributes: true, attributeFilter: ['style'] }));
        const resize = new ResizeObserver(schedule);
        resize.observe(container); schedule();
        return () => { mutations.disconnect(); resize.disconnect(); if (frame !== null) cancelAnimationFrame(frame); selected?.removeAttribute('data-touch-center'); };
    }, [containerRef]);
    return focused;
};
