import { describe, expect, it, vi } from 'vitest';
import { createTouchCameraFrame } from '@/components/wall/touchCameraFrame';

// Touch samples must coalesce without losing the last pinch position or surviving cancellation.
const setup = () => {
    const queue = new Map<number, FrameRequestCallback>();
    let handle = 0;
    const write = vi.fn();
    const frame = createTouchCameraFrame(write, callback => { queue.set(++handle, callback); return handle; }, id => { queue.delete(id); });
    const tick = () => { const callbacks = [...queue.values()]; queue.clear(); callbacks.forEach(callback => callback(16)); };
    return { frame, write, queue, tick };
};
describe('touch camera frame scheduling', () => {
    it('writes the newest sample once per animation frame', () => {
        const { frame, write, queue, tick } = setup();
        for (let x = 0; x < 100; x++) frame.schedule({ x, y: x * 2, scale: 0.6 });
        expect(queue.size).toBe(1);
        expect(write).not.toHaveBeenCalled();
        tick();
        expect(write).toHaveBeenCalledExactlyOnceWith({ x: 99, y: 198, scale: 0.6 });
        expect(queue.size).toBe(0);
    });
    it('flushes the final pinch camera before persisting scale or switching to a single finger', () => {
        const { frame, write, queue, tick } = setup();
        frame.schedule({ x: 50, y: 70, scale: 0.9 });
        frame.flush();
        expect(write).toHaveBeenCalledExactlyOnceWith({ x: 50, y: 70, scale: 0.9 });
        expect(queue.size).toBe(0);
        tick();
        expect(write).toHaveBeenCalledTimes(1);
    });
    it('discards queued writes on cancellation and allows a later gesture', () => {
        const { frame, write, queue, tick } = setup();
        frame.schedule({ x: 10, y: 20, scale: 1 });
        frame.cancel();
        tick();
        expect(write).not.toHaveBeenCalled();
        expect(queue.size).toBe(0);
        frame.schedule({ x: 30, y: 40, scale: 1 });
        tick();
        expect(write).toHaveBeenCalledExactlyOnceWith({ x: 30, y: 40, scale: 1 });
    });
});
