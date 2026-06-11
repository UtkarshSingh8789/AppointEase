import React from 'react';

interface IllustrationProps {
  className?: string;
}

/** A heart illustration for favorites empty state */
export const HeartIllustration: React.FC<IllustrationProps> = ({ className = '' }) => {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full h-auto ${className}`}
      role="img"
      aria-label="Heart favorites illustration"
    >
      <style>{`
        @keyframes heartBeat {
          0%, 100% { transform: scale(1); }
          15% { transform: scale(1.05); }
          30% { transform: scale(1); }
          45% { transform: scale(1.03); }
          60% { transform: scale(1); }
        }
        .heart-main { animation: heartBeat 2s ease-in-out infinite; transform-origin: 100px 100px; }
      `}</style>

      <g className="heart-main">
        {/* Main heart shape */}
        <path
          d="M100 160 C60 130, 20 100, 20 70 C20 45, 45 30, 65 30 C80 30, 92 40, 100 50 C108 40, 120 30, 135 30 C155 30, 180 45, 180 70 C180 100, 140 130, 100 160 Z"
          fill="currentColor"
          opacity="0.12"
          stroke="currentColor"
          strokeWidth="2"
          strokeOpacity="0.2"
        />

        {/* Heart shine */}
        <path
          d="M60 60 Q65 50, 75 55"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          opacity="0.15"
        />
      </g>

      {/* Small floating hearts */}
      <path d="M40 40 C40 35, 45 33, 47 33 C49 33, 52 35, 52 38 C52 42, 46 46, 46 46 C46 46, 40 42, 40 40 Z" fill="currentColor" opacity="0.1" />
      <path d="M160 35 C160 31, 164 29, 166 29 C168 29, 170 31, 170 33 C170 36, 165 39, 165 39 C165 39, 160 36, 160 35 Z" fill="currentColor" opacity="0.08" />
      <path d="M155 155 C155 152, 158 150, 160 150 C162 150, 164 152, 164 154 C164 156, 160 159, 160 159 C160 159, 155 156, 155 155 Z" fill="currentColor" opacity="0.08" />

      {/* Decorative sparkles */}
      <circle cx="35" cy="120" r="2" fill="currentColor" opacity="0.08" />
      <circle cx="170" cy="110" r="3" fill="currentColor" opacity="0.06" />
      <path d="M30 80 L32 77 L34 80 L32 83 Z" fill="currentColor" opacity="0.1" />
      <path d="M175 70 L177 67 L179 70 L177 73 Z" fill="currentColor" opacity="0.08" />
    </svg>
  );
};
