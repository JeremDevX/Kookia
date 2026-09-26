import { useEffect, useState } from "react";
import "./SplashScreen.css";

interface SplashScreenProps {
  ready: boolean;
  caption: string;
  onComplete: () => void;
}

export default function SplashScreen({ ready, caption, onComplete }: SplashScreenProps) {
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const canDismiss = ready && minimumElapsed;

  useEffect(() => {
    const minimumTimer = window.setTimeout(() => setMinimumElapsed(true), 3000);
    return () => window.clearTimeout(minimumTimer);
  }, []);

  useEffect(() => {
    if (!canDismiss) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Exit only once both the real loading and the minimum display time are complete.
    const completeTimer = window.setTimeout(onComplete, reducedMotion ? 0 : 400);
    return () => window.clearTimeout(completeTimer);
  }, [canDismiss, onComplete]);

  return (
    <div className={`splash-screen ${canDismiss ? "fade-out" : ""}`} role="status" aria-label="Ouverture de KookiA">
      <div className="splash-tide" aria-hidden="true">
        <svg className="splash-wave splash-wave-back" viewBox="0 0 2400 240" preserveAspectRatio="none">
          <path d="M0 80 C200 0 400 0 600 80 S1000 160 1200 80 S1600 0 1800 80 S2200 160 2400 80 V240 H0Z" />
        </svg>
        <svg className="splash-wave splash-wave-front" viewBox="0 0 2400 240" preserveAspectRatio="none">
          <path d="M0 130 C200 190 400 190 600 130 S1000 70 1200 130 S1600 190 1800 130 S2200 70 2400 130 V240 H0Z" />
        </svg>
      </div>
      <div className="splash-content">
        <img className="splash-logo" src="/logo_kookia.svg" alt="KookiA" width="190" height="48" />
        <p className="splash-welcome">Heureux de vous retrouver en cuisine.</p>
        <p className="splash-caption">{ready ? "Ouverture de votre espace…" : caption}</p>
      </div>
    </div>
  );
}
