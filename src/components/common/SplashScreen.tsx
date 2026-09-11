import { useState, useEffect } from "react";
import "./SplashScreen.css";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fadeTimer = window.setTimeout(() => setFadeOut(true), reducedMotion ? 100 : 1100);
    const completeTimer = window.setTimeout(onComplete, reducedMotion ? 150 : 1450);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className={`splash-screen ${fadeOut ? "fade-out" : ""}`} role="status" aria-label="Ouverture de KookiA">
      <div className="splash-content">
        <span className="splash-eyebrow">LE BON SENS EN CUISINE</span>
        <img className="splash-logo" src="/logo_kookia.svg" alt="KookiA" width="190" height="48" />
        <p className="splash-tagline">Moins de gaspillage.<br /><span>Plus de sérénité.</span></p>
        <div className="splash-loading" aria-hidden="true"><span /></div>
        <p className="splash-caption">Ouverture de votre espace</p>
      </div>
      <p className="splash-footer">Pensé pour votre cuisine. Et pour demain.</p>
    </div>
  );
}
