import React from 'react';

interface IllustrationProps {
  className?: string;
}

/** A doctor character with stethoscope, waving — flat illustration style */
export const DoctorIllustration: React.FC<IllustrationProps> = ({ className = '' }) => {
  return (
    <svg
      viewBox="0 0 200 250"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full h-auto ${className}`}
      role="img"
      aria-label="Doctor illustration"
    >
      <style>{`
        @keyframes docWave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-5deg); }
          75% { transform: rotate(5deg); }
        }
        .wave-arm { animation: docWave 2s ease-in-out infinite; transform-origin: 130px 140px; }
      `}</style>

      {/* Shadow */}
      <ellipse cx="100" cy="240" rx="40" ry="8" fill="currentColor" opacity="0.08" />

      {/* Lab coat / body */}
      <path d="M70 145 C70 135, 130 135, 130 145 L135 230 L65 230 Z" fill="currentColor" opacity="0.12" />
      
      {/* Coat details */}
      <line x1="100" y1="145" x2="100" y2="220" stroke="currentColor" strokeWidth="1" opacity="0.15" />
      
      {/* Collar */}
      <path d="M85 140 L100 155 L115 140" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.2" />

      {/* Head */}
      <circle cx="100" cy="110" r="25" fill="currentColor" opacity="0.15" />
      
      {/* Hair */}
      <path d="M75 105 C75 85, 125 85, 125 105" fill="currentColor" opacity="0.25" />
      
      {/* Face features */}
      <circle cx="92" cy="108" r="2" fill="currentColor" opacity="0.3" />
      <circle cx="108" cy="108" r="2" fill="currentColor" opacity="0.3" />
      <path d="M95 118 Q100 122, 105 118" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.25" />

      {/* Stethoscope */}
      <path d="M90 140 Q85 160, 95 170 Q105 180, 110 165" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.3" />
      <circle cx="110" cy="165" r="4" fill="currentColor" opacity="0.25" />

      {/* Waving arm */}
      <g className="wave-arm">
        <path d="M130 145 Q145 130, 150 110" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.18" />
        {/* Hand */}
        <circle cx="150" cy="108" r="7" fill="currentColor" opacity="0.15" />
        {/* Fingers spread */}
        <path d="M147 102 L145 97" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.15" />
        <path d="M150 101 L150 95" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.15" />
        <path d="M153 102 L155 97" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.15" />
      </g>

      {/* Left arm */}
      <path d="M70 145 Q55 160, 60 180" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.15" />

      {/* Legs */}
      <rect x="82" y="220" width="14" height="22" rx="5" fill="currentColor" opacity="0.12" />
      <rect x="104" y="220" width="14" height="22" rx="5" fill="currentColor" opacity="0.12" />

      {/* Cross badge */}
      <rect x="93" y="148" width="14" height="14" rx="3" fill="currentColor" opacity="0.2" />
      <path d="M98 152 L98 158 M95 155 L101 155" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
};
