import { buildDomTextShadow, clamp } from './cadenzaEnvelopes';
import { writeOverlayGlyphShadow } from './cadenzaOverlayNodes';
import type { OverlayWordNodes } from './cadenzaTypes';

// Keep the expensive shadow raster stable while the native performance profile fades its opacity.
export const createCadenzaGlowWriter = (performanceMode: boolean) => {
    const shadows = new Map<string, string>();
    return (nodes: OverlayWordNodes, index: number, color: string, intensity: number, blurScale: number) => {
        if (!performanceMode) {
            if (nodes.glyphOpacities[index]) {
                nodes.glyphSpans[index]!.style.opacity = '';
                nodes.glyphOpacities[index] = '';
            }
            writeOverlayGlyphShadow(nodes, index, buildDomTextShadow(color, intensity, blurScale));
            return;
        }
        let shadow = shadows.get(color);
        if (shadow === undefined) {
            shadow = buildDomTextShadow(color, 1);
            shadows.set(color, shadow);
        }
        writeOverlayGlyphShadow(nodes, index, shadow);
        const opacity = String(Math.round((intensity <= 0.01 ? 0 : clamp(intensity, 0, 1)) * 255) / 255);
        if (nodes.glyphOpacities[index] !== opacity) {
            nodes.glyphOpacities[index] = opacity;
            nodes.glyphSpans[index]!.style.opacity = opacity;
        }
    };
};
