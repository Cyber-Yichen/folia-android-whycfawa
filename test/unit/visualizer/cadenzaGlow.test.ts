import { describe, expect, it } from 'vitest';
import { createCadenzaGlowWriter } from '@/components/visualizer/cadenza/cadenzaGlow';
import { buildDomTextShadow } from '@/components/visualizer/cadenza/cadenzaEnvelopes';
import type { OverlayWordNodes } from '@/components/visualizer/cadenza/cadenzaTypes';

// Verify that native glow animation avoids re-rasterizing shadows and restores the full-quality path.
const createGlyph = () => {
    let shadow = '', opacity = '', shadowWrites = 0, opacityWrites = 0;
    const style = {
        get textShadow() { return shadow; },
        set textShadow(value: string) { shadow = value; shadowWrites += 1; },
        get opacity() { return opacity; },
        set opacity(value: string) { opacity = value; opacityWrites += 1; },
    };
    const nodes = {
        glyphSpans: [{ style } as HTMLSpanElement],
        glyphShadows: [],
        glyphOpacities: [],
    } as unknown as OverlayWordNodes;
    return { nodes, style, counts: () => ({ shadowWrites, opacityWrites }) };
};

describe('Cadenza glow rendering', () => {
    it('uses one stable shadow through a full brightness sweep', () => {
        const glyph = createGlyph();
        const write = createCadenzaGlowWriter(true);
        for (let frame = 0; frame < 400; frame += 1) {
            write(glyph.nodes, 0, '#f08040', frame / 399, 1 + frame / 1000);
        }
        expect(glyph.counts().shadowWrites).toBe(1);
        expect(glyph.style.textShadow).toBe(buildDomTextShadow('#f08040', 1));
        expect(glyph.style.opacity).toBe('1');
        expect(glyph.counts().opacityWrites).toBeLessThanOrEqual(256);
        write(glyph.nodes, 0, '#f08040', 2, 2);
        expect(glyph.style.opacity).toBe('1');
        write(glyph.nodes, 0, '#f08040', -1, 2);
        expect(glyph.style.opacity).toBe('0');
    });

    it('keeps glyph fades independent and updates a changed theme color', () => {
        const glyph = createGlyph();
        glyph.nodes.glyphSpans.push({ style: {} } as HTMLSpanElement);
        const write = createCadenzaGlowWriter(true);
        write(glyph.nodes, 0, '#ffffff', 0.2, 1);
        write(glyph.nodes, 1, '#ffffff', 0.8, 1);
        expect(glyph.nodes.glyphSpans[0].style.opacity).toBe('0.2');
        expect(glyph.nodes.glyphSpans[1].style.opacity).toBe('0.8');
        write(glyph.nodes, 0, '#000000', 0.2, 1);
        expect(glyph.style.textShadow).toBe(buildDomTextShadow('#000000', 1));
    });

    it('preserves the original shadow envelope with the profile disabled', () => {
        const glyph = createGlyph();
        createCadenzaGlowWriter(true)(glyph.nodes, 0, '#e08030', 0.2, 1);
        const write = createCadenzaGlowWriter(false);
        for (const intensity of [0, 0.2, 0.8, 1.6]) {
            write(glyph.nodes, 0, '#e08030', intensity, 1.2);
            expect(glyph.style.textShadow).toBe(buildDomTextShadow('#e08030', intensity, 1.2));
            expect(glyph.style.opacity).toBe('');
        }
    });
});
