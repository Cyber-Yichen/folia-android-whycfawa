import { useCallback, useEffect, useRef, useState } from 'react';

// src/components/floating-player/useTouchPlayerDisclosure.ts
// Touch disclosure has its own idle clock; hover and playback state never pin it open.
export const TOUCH_PLAYER_COLLAPSE_MS = 4000;
export function useTouchPlayerDisclosure(active: boolean, pinned: boolean) {
    const [expanded, setExpanded] = useState(false);
    const expandedRef = useRef(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<number | null>(null);
    const pointers = useRef(new Set<number>());
    const seeking = useRef(false);
    const clear = useCallback(() => {
        if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        timerRef.current = null;
    }, []);
    const collapse = useCallback(() => {
        clear();
        expandedRef.current = false;
        setExpanded(false);
    }, [clear]);
    const schedule = useCallback(() => {
        clear();
        if (!active || pinned || !expandedRef.current || pointers.current.size || seeking.current) return;
        timerRef.current = window.setTimeout(collapse, TOUCH_PLAYER_COLLAPSE_MS);
    }, [active, clear, collapse, pinned]);
    const expand = useCallback(() => {
        expandedRef.current = true;
        setExpanded(true);
        schedule();
    }, [schedule]);
    const seekStart = useCallback(() => { seeking.current = true; clear(); }, [clear]);
    const seekEnd = useCallback(() => { seeking.current = false; schedule(); }, [schedule]);
    useEffect(() => {
        if (!active) { collapse(); return; }
        const onDown = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                if (!pinned) collapse();
                return;
            }
            pointers.current.add(event.pointerId);
            clear();
        };
        const onUp = (event: PointerEvent) => {
            pointers.current.delete(event.pointerId);
            schedule();
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !pinned) collapse();
            else if (rootRef.current?.contains(event.target as Node)) schedule();
        };
        const onBlur = () => { pointers.current.clear(); seeking.current = false; if (!pinned) collapse(); };
        window.addEventListener('blur', onBlur);
        window.addEventListener('pointerdown', onDown, true);
        window.addEventListener('pointerup', onUp, true);
        window.addEventListener('pointercancel', onUp, true);
        window.addEventListener('keydown', onKey);
        schedule();
        return () => {
            clear();
            pointers.current.clear();
            window.removeEventListener('blur', onBlur);
            window.removeEventListener('pointerdown', onDown, true);
            window.removeEventListener('pointerup', onUp, true);
            window.removeEventListener('pointercancel', onUp, true);
            window.removeEventListener('keydown', onKey);
        };
    }, [active, clear, collapse, pinned, schedule]);
    return { expanded, rootRef, expand, collapse, seekStart, seekEnd };
}
