import { describe, expect, it } from 'vitest';
import { getCustomSelectPosition, sameCustomSelectPosition } from '@/components/shared/customSelectPosition';

// Menu positioning follows the keyboard-reduced visual viewport, including pan and horizontal offsets.
describe('custom select visible viewport placement', () => {
    it('retains ordinary desktop placement and flips above a low trigger', () => {
        const viewport = { left: 0, top: 0, width: 1000, height: 700 };
        expect(getCustomSelectPosition({ left: 20, top: 20, bottom: 64, width: 240 }, viewport, 700))
            .toMatchObject({ placement: 'bottom', left: 20, top: 68, maxHeight: 240 });
        expect(getCustomSelectPosition({ left: 20, top: 620, bottom: 664, width: 240 }, viewport, 700))
            .toMatchObject({ placement: 'top', bottom: 84, maxHeight: 240 });
    });
    it('keeps the entire menu within a keyboard-reduced viewport for every anchor position', () => {
        for (const height of [100, 240, 400]) {
            const viewport = { left: 30, top: 180, width: 320, height };
            for (const top of [10, 190, 240, 390, 640]) {
                const pos = getCustomSelectPosition({ left: 0, top, bottom: top + 44, width: 600 }, viewport, 800);
                const y = pos.top ?? 800 - pos.bottom! - pos.maxHeight;
                expect(pos.left).toBeGreaterThanOrEqual(viewport.left + 8);
                expect(pos.left + pos.width).toBeLessThanOrEqual(viewport.left + viewport.width - 8);
                expect(y).toBeGreaterThanOrEqual(viewport.top + 8);
                expect(y + pos.maxHeight).toBeLessThanOrEqual(viewport.top + viewport.height - 8);
            }
        }
    });
    it('recognizes unchanged geometry and distinguishes a viewport pan', () => {
        const rect = { left: 20, top: 300, bottom: 344, width: 200 };
        const a = getCustomSelectPosition(rect, { left: 0, top: 100, width: 390, height: 240 }, 700);
        expect(sameCustomSelectPosition(null, a)).toBe(false);
        expect(sameCustomSelectPosition({ ...a }, a)).toBe(true);
        const b = getCustomSelectPosition(rect, { left: 0, top: 120, width: 390, height: 240 }, 700);
        expect(sameCustomSelectPosition(a, b)).toBe(false);
    });
});
