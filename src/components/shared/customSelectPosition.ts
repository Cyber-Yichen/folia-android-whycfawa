import type { CustomSelectMenuPosition } from './CustomSelectMenu';

// Keep portaled menus inside the visible viewport when a phone keyboard or viewport pan reduces it.
type SelectAnchor = { left: number; top: number; bottom: number; width: number };
type SelectViewport = { left: number; top: number; width: number; height: number };

export const getCustomSelectPosition = (
    rect: SelectAnchor,
    viewport: SelectViewport,
    layoutHeight: number,
): CustomSelectMenuPosition => {
    const gap = 4, gutter = 8, preferredHeight = 160;
    const right = viewport.left + viewport.width, bottom = viewport.top + viewport.height;
    const spaceBelow = Math.max(0, bottom - rect.bottom - gap - gutter);
    const spaceAbove = Math.max(0, rect.top - viewport.top - gap - gutter);
    const outside = rect.top < viewport.top || rect.bottom > bottom;
    const placement = outside || Math.max(spaceAbove, spaceBelow) < preferredHeight
        ? 'viewport'
        : spaceBelow < preferredHeight && spaceAbove > spaceBelow ? 'top' : 'bottom';
    const availableHeight = placement === 'viewport'
        ? Math.max(0, viewport.height - gutter * 2)
        : placement === 'top' ? spaceAbove : spaceBelow;
    const width = Math.max(0, Math.min(rect.width, viewport.width - gutter * 2));
    return {
        left: Math.max(viewport.left + gutter, Math.min(rect.left, right - width - gutter)),
        width,
        maxHeight: placement === 'viewport' ? availableHeight : Math.min(240, availableHeight),
        placement,
        ...(placement === 'viewport' ? { top: viewport.top + gutter }
            : placement === 'top' ? { bottom: layoutHeight - rect.top + gap }
            : { top: rect.bottom + gap }),
    };
};

export const sameCustomSelectPosition = (a: CustomSelectMenuPosition | null, b: CustomSelectMenuPosition) => (
    a !== null && a.left === b.left && a.width === b.width && a.maxHeight === b.maxHeight
    && a.top === b.top && a.bottom === b.bottom && a.placement === b.placement
);
