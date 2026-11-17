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
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const minimumTimer = window.setTimeout(() => setMinimumElapsed(true), reducedMotion ? 0 : 1400);
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
      <div className="splash-content">
        <div className="splash-brand">
          <span className="splash-mark" aria-hidden="true">K</span>
          <strong className="splash-wordmark">KookIA</strong>
        </div>
        <p className="splash-welcome">Bienvenue en cuisine.</p>
        <p className="splash-caption">{ready ? "Ouverture de votre espace…" : caption}</p>
        <div className="splash-loader" aria-hidden="true"><span /><span /><span /></div>
      </div>
    </div>
  );
}
