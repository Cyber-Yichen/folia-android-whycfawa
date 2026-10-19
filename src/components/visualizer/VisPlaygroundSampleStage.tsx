import React, { useLayoutEffect, useRef, useState } from 'react';
import { MotionConfig } from 'framer-motion';

// src/components/visualizer/VisPlaygroundSampleStage.tsx
// Like the desktop sample, draw at window size then fit the drawing into its box.
// Styles using vw/vh retain the proportions they have on the playing page.
export default function VisPlaygroundSampleStage({ children }: { children: React.ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 0, height: 0, scale: 1 });
    useLayoutEffect(() => {
        const box = ref.current;
        if (!box) return;
        const update = () => {
            const width = box.clientWidth;
            const height = box.clientHeight;
            if (width <= 0 || height <= 0) return;
            const scale = Math.min(width / window.innerWidth, height / window.innerHeight);
            setSize({ width: width / scale, height: height / scale, scale });
        };
        const observer = new ResizeObserver(update);
        observer.observe(box);
        window.addEventListener('resize', update);
        update();
        return () => { observer.disconnect(); window.removeEventListener('resize', update); };
    }, []);
    return <div ref={ref} className="absolute inset-0 overflow-hidden">
        {size.width > 0 && <div className="absolute origin-top-left"
            style={{ width: size.width, height: size.height, transform: 'scale(' + size.scale + ')' }}>
            <MotionConfig transformPagePoint={point => ({ x: point.x / size.scale, y: point.y / size.scale })}>
                {children}
            </MotionConfig>
        </div>}
    </div>;
}
