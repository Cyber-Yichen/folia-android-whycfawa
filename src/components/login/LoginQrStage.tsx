import { Check, Smartphone } from 'lucide-react';
import './LoginQrStage.css';

// src/components/login/LoginQrStage.tsx
// A presentational QR tile shared by both account surfaces; auth owns every state.
type Props = {
    src: string;
    phase: string;
};
export default function LoginQrStage({ src, phase }: Props) {
    const acknowledged = phase === 'scanned' || phase === 'confirmed';
    return (
        <div className="login-qr-stage" data-login-phase={phase}>
            <span className="login-qr-orbit" aria-hidden="true" />
            <img key={src} className="login-qr-code" src={src} alt="QR Code" />
            {acknowledged && (
                <span className="login-qr-result" aria-hidden="true" key={phase}>
                    {phase === 'confirmed' ? <Check strokeWidth={2.5} /> : <Smartphone strokeWidth={1.5} />}
                </span>
            )}
        </div>
    );
}
