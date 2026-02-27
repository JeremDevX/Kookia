import React, { useState, useEffect } from "react";
import "./SplashScreen.css";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Start fade out after 3.5 seconds
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 3500);

    // Complete after fade animation (3.5s + 0.6s)
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 4100);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className={`splash-screen ${fadeOut ? "fade-out" : ""}`}>
      <div className="splash-content">
        <svg
          className="splash-logo"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 122.8 29.66"
        >
          {/* K majuscule */}
          <path
            className="logo-letter letter-k"
            fill="#1b263b"
            d="M0,29.66V1.58h4.11v28.08H0ZM2.49,20.72l.36-3.92c2.03,0,3.78-.42,5.26-1.27,1.48-.85,2.69-2,3.65-3.44.96-1.44,1.67-3.07,2.14-4.88.47-1.81.7-3.69.7-5.62h4.07c0,2.49-.36,4.88-1.09,7.18-.72,2.29-1.78,4.34-3.16,6.14s-3.08,3.22-5.08,4.26c-2,1.04-4.28,1.56-6.84,1.56ZM15.22,29.66l-7.12-13.68,3.56-2.02,8.34,15.7h-4.79Z"
          />

          {/* Premier o (avec œil gauche) */}
          <path
            className="logo-letter letter-o1"
            fill="#1b263b"
            d="M20.81,19.5c0-5.71,4.17-10.16,10.24-10.16s10.24,4.45,10.24,10.16-4.17,10.16-10.24,10.16-10.24-4.41-10.24-10.16ZM31.05,25.73c3.76,0,6.11-2.87,6.11-6.23s-2.35-6.27-6.11-6.27-6.15,2.91-6.15,6.27,2.39,6.23,6.15,6.23Z"
          />

          {/* Deuxième o (avec œil droit) */}
          <path
            className="logo-letter letter-o2"
            fill="#1b263b"
            d="M43.2,19.5c0-5.71,4.17-10.16,10.24-10.16s10.24,4.45,10.24,10.16-4.17,10.16-10.24,10.16-10.24-4.41-10.24-10.16ZM53.44,25.73c3.76,0,6.11-2.87,6.11-6.23s-2.35-6.27-6.11-6.27-6.15,2.91-6.15,6.27,2.39,6.23,6.15,6.23Z"
          />

          {/* k minuscule */}
          <path
            className="logo-letter letter-k2"
            fill="#1b263b"
            d="M66.84,29.66V0h4.19v29.66h-4.19ZM69.8,21.71v-3.76h2.37c1.74,0,3.17-.3,4.29-.9,1.12-.6,2-1.58,2.64-2.94.64-1.36,1.11-3.16,1.41-5.42h4.35c-.55,4.36-1.8,7.62-3.73,9.78s-4.59,3.23-7.98,3.23h-3.36ZM81.03,29.66l-5.97-10.2,3.95-1.62,7.2,11.82h-5.18Z"
          />

          {/* i (vert) avec loader */}
          <g className="logo-letter letter-i">
            {/* Arc spinner qui devient le point */}
            <circle
              className="letter-i-spinner"
              cx="92.16"
              cy="4.33"
              r="2.47"
              fill="none"
              stroke="#00c796"
              strokeWidth="2.4"
              strokeDasharray="5 10.5"
              strokeLinecap="round"
            />
            {/* Point final du i (apparaît à la fin) */}
            <ellipse
              className="letter-i-dot-final"
              fill="#00c796"
              cx="92.16"
              cy="4.33"
              rx="2.51"
              ry="2.43"
            />
            <rect
              className="letter-i-body"
              fill="#00c796"
              x="90.13"
              y="9.3"
              width="4.05"
              height="20.36"
              rx="0"
            />
          </g>

          {/* A (vert) */}
          <path
            className="logo-letter letter-a"
            fill="#00c796"
            d="M108.56,1.9h1.17l13.07,27.76h-4.61l-2.83-6.15h-12.54l-2.79,6.15h-4.53L108.56,1.9ZM113.58,19.62l-4.49-9.83-4.49,9.83h8.99Z"
          />

          {/* Œil gauche (premier o) */}
          <g className="eye-group eye-left">
            <circle
              className="eye-pupil"
              fill="#1b263b"
              cx="31.02"
              cy="19.62"
              r="3.85"
            />
            <circle
              className="eye-reflex"
              fill="#f3f4f6"
              cx="32.11"
              cy="18.38"
              r="1.25"
            />
          </g>

          {/* Œil droit (deuxième o) */}
          <g className="eye-group eye-right">
            <circle
              className="eye-pupil"
              fill="#1b263b"
              cx="53.41"
              cy="19.62"
              r="3.85"
            />
            <circle
              className="eye-reflex"
              fill="#f3f4f6"
              cx="54.5"
              cy="18.38"
              r="1.25"
            />
          </g>
        </svg>

        <div className="splash-tagline-container">
          <p className="splash-tagline">L'IA au service de la restauration</p>
          <div className="loading-dots">
            <span className="loading-dot"></span>
            <span className="loading-dot"></span>
            <span className="loading-dot"></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
