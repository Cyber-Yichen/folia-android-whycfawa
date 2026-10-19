// src/components/app/lattice/latticeViewportScale.ts
// Fit the expanded poster in both viewport axes while retaining desktop scale choices.
export const resolveLatticeViewportScale = (width: number, height: number, expandedSize: number, touch: boolean): number => {
    const preferred = width < 640 ? 0.52 : width < 1100 ? 0.64 : 0.76;
    if (!touch || ![width, height, expandedSize].every(value => Number.isFinite(value) && value > 0)) return preferred;
    return Math.max(0.1, Math.min(preferred, (width - 32) / expandedSize, (height - 168) / expandedSize));
};
