import React from 'react';

interface HemiHeroCardsProps {
  className?: string;
}

export const HemiHeroCards: React.FC<HemiHeroCardsProps> = ({ className = '' }) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Subtle ambient glow — much less intense */}
      <div className="absolute inset-0 bg-radial-gradient from-white/[0.03] via-transparent to-transparent blur-2xl pointer-events-none transform scale-110" />

      <svg
        viewBox="0 0 380 280"
        className="w-full max-w-[380px] h-auto overflow-visible filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="heroCardAura" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#FF5500" stopOpacity="0.12" />
            <stop offset="60%" stopColor="#FF3700" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#0B0E14" stopOpacity="0" />
          </radialGradient>

          <filter id="heroCardDropShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#000000" floodOpacity="0.7" />
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#FF4600" floodOpacity="0.15" />
          </filter>

          <linearGradient id="heroBorderGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.06)" />
          </linearGradient>
        </defs>

        {/* Ambient background glow circle — subtle */}
        <circle cx="210" cy="140" r="130" fill="url(#heroCardAura)" />

        {/* Card 1 (Far Left / Back Card, angled at -26 degrees) */}
        <g transform="translate(100, 155) rotate(-26) translate(-50, -75)" filter="url(#heroCardDropShadow)">
          <rect
            x="0"
            y="0"
            width="100"
            height="150"
            rx="12"
            fill="#0C0F14"
            stroke="url(#heroBorderGlow)"
            strokeWidth="1.5"
          />
          {/* Inner frame */}
          <rect
            x="6"
            y="6"
            width="88"
            height="138"
            rx="8"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
          {/* Center Hemi Logo */}
          <g transform="translate(50, 75) scale(0.6)">
            <path d="M -5 -32 A 32 32 0 0 0 -5 32 L -5 12 A 12 12 0 0 1 -5 -12 Z" fill="#FF4600" />
            <path d="M 5 -32 A 32 32 0 0 1 5 32 L 5 12 A 12 12 0 0 0 5 -12 Z" fill="#FF4600" />
          </g>
        </g>

        {/* Card 2 (Middle Card, angled at -6 degrees) */}
        <g transform="translate(195, 135) rotate(-6) translate(-58, -88)" filter="url(#heroCardDropShadow)">
          <rect
            x="0"
            y="0"
            width="116"
            height="176"
            rx="14"
            fill="#0C0F14"
            stroke="url(#heroBorderGlow)"
            strokeWidth="1.5"
          />
          {/* Inner frame */}
          <rect
            x="7"
            y="7"
            width="102"
            height="162"
            rx="10"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
          {/* Center Hemi Logo */}
          <g transform="translate(58, 88) scale(0.85)">
            <path d="M -6 -36 A 36 36 0 0 0 -6 36 L -6 14 A 14 14 0 0 1 -6 -14 Z" fill="#FF4600" />
            <path d="M 6 -36 A 36 36 0 0 1 6 36 L 6 14 A 14 14 0 0 0 6 -14 Z" fill="#FF4600" />
          </g>
        </g>

        {/* Card 3 (Front Right Card, angled at +16 degrees) */}
        <g transform="translate(275, 130) rotate(16) translate(-62, -94)" filter="url(#heroCardDropShadow)">
          <rect
            x="0"
            y="0"
            width="124"
            height="188"
            rx="16"
            fill="#0A0D12"
            stroke="url(#heroBorderGlow)"
            strokeWidth="1.8"
          />
          {/* Inner frame */}
          <rect
            x="8"
            y="8"
            width="108"
            height="172"
            rx="12"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
          {/* Center Hemi Logo */}
          <g transform="translate(62, 94) scale(0.95)">
            <path d="M -7 -38 A 38 38 0 0 0 -7 38 L -7 15 A 15 15 0 0 1 -7 -15 Z" fill="#FF4600" />
            <path d="M 7 -38 A 38 38 0 0 1 7 38 L 7 15 A 15 15 0 0 0 7 -15 Z" fill="#FF4600" />
          </g>
        </g>
      </svg>
    </div>
  );
};
