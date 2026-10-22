import type { LatticeCamera } from './useWallCameraPan';

// Coalesce touch samples into one camera write per frame, retaining the final sample on release.
export const createTouchCameraFrame = (
    write: (camera: LatticeCamera) => void,
    request: typeof requestAnimationFrame = requestAnimationFrame,
    cancel: typeof cancelAnimationFrame = cancelAnimationFrame,
) => {
    let frame: number | null = null;
    let pending: LatticeCamera | null = null;
    const cancelFrame = () => {
        if (frame !== null) cancel(frame);
        frame = null;
    };
    const flush = () => {
        cancelFrame();
        const camera = pending;
        pending = null;
        if (camera) write(camera);
    };
    return {
        schedule: (camera: LatticeCamera) => {
            pending = camera;
            if (frame === null) frame = request(() => {
                frame = null;
                flush();
            });
        },
        flush,
        cancel: () => { cancelFrame(); pending = null; },
    };
};
