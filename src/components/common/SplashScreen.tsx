import { useState, useEffect } from "react";
import { ChefHat } from "lucide-react";
import "./SplashScreen.css";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fadeTimer = window.setTimeout(() => setFadeOut(true), reducedMotion ? 100 : 2200);
    const completeTimer = window.setTimeout(onComplete, reducedMotion ? 150 : 2600);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className={`splash-screen ${fadeOut ? "fade-out" : ""}`} role="status" aria-label="Ouverture de KookiA">
      <div className="splash-content">
        <div className="splash-emblem" aria-hidden="true"><ChefHat strokeWidth={1.4} /></div>
        <img className="splash-logo" src="/logo_kookia.svg" alt="KookiA" width="190" height="48" />
        <div className="splash-loading" aria-hidden="true"><span /></div>
        <p className="splash-caption">Chargement de votre espace…</p>
      </div>
    </div>
  );
}
