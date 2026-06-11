import React from 'react';

interface IllustrationProps {
  className?: string;
}

/** A person interacting with a large calendar — flat design with float animation */
export const CalendarIllustration: React.FC<IllustrationProps> = ({ className = '' }) => {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full h-auto ${className}`}
      role="img"
      aria-label="Person interacting with a calendar"
    >
      <style>{`
        @keyframes illustFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        .float-group { animation: illustFloat 3s ease-in-out infinite; }
      `}</style>

      <g className="float-group">
        {/* Calendar body */}
        <rect x="120" y="60" width="180" height="180" rx="12" fill="currentColor" opacity="0.08" />
        <rect x="120" y="60" width="180" height="40" rx="12" fill="currentColor" opacity="0.15" />
        
        {/* Calendar header dots */}
        <circle cx="150" cy="80" r="5" fill="currentColor" opacity="0.4" />
        <circle cx="170" cy="80" r="5" fill="currentColor" opacity="0.4" />
        <circle cx="190" cy="80" r="5" fill="currentColor" opacity="0.4" />

        {/* Calendar grid lines */}
        <rect x="140" y="115" width="30" height="25" rx="4" fill="currentColor" opacity="0.06" />
        <rect x="180" y="115" width="30" height="25" rx="4" fill="currentColor" opacity="0.06" />
        <rect x="220" y="115" width="30" height="25" rx="4" fill="currentColor" opacity="0.06" />
        <rect x="260" y="115" width="30" height="25" rx="4" fill="currentColor" opacity="0.06" />

        <rect x="140" y="150" width="30" height="25" rx="4" fill="currentColor" opacity="0.06" />
        <rect x="180" y="150" width="30" height="25" rx="4" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="1.5" />
        <rect x="220" y="150" width="30" height="25" rx="4" fill="currentColor" opacity="0.06" />
        <rect x="260" y="150" width="30" height="25" rx="4" fill="currentColor" opacity="0.06" />

        <rect x="140" y="185" width="30" height="25" rx="4" fill="currentColor" opacity="0.06" />
        <rect x="180" y="185" width="30" height="25" rx="4" fill="currentColor" opacity="0.06" />
        <rect x="220" y="185" width="30" height="25" rx="4" fill="currentColor" opacity="0.06" />
        <rect x="260" y="185" width="30" height="25" rx="4" fill="currentColor" opacity="0.06" />

        {/* Checkmarks on calendar */}
        <path d="M188 128 L192 132 L200 122" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
        <path d="M228 128 L232 132 L240 122" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
        <path d="M148 163 L152 167 L160 157" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />

        {/* Highlighted date */}
        <rect x="220" y="150" width="30" height="25" rx="4" fill="currentColor" opacity="0.2" />
        <circle cx="235" cy="162" r="8" fill="currentColor" opacity="0.3" />
      </g>

      {/* Person */}
      <g>
        {/* Body */}
        <ellipse cx="75" cy="260" rx="30" ry="8" fill="currentColor" opacity="0.08" />
        <path d="M60 200 C60 180, 90 180, 90 200 L90 250 L60 250 Z" fill="currentColor" opacity="0.15" />
        
        {/* Torso */}
        <rect x="62" y="195" width="26" height="45" rx="8" fill="currentColor" opacity="0.2" />
        
        {/* Head */}
        <circle cx="75" cy="175" r="18" fill="currentColor" opacity="0.2" />
        
        {/* Hair */}
        <path d="M57 170 C57 155, 93 155, 93 170" fill="currentColor" opacity="0.3" />
        
        {/* Arm pointing at calendar */}
        <path d="M88 210 Q110 200, 135 165" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.2" />
        
        {/* Hand */}
        <circle cx="135" cy="165" r="5" fill="currentColor" opacity="0.25" />

        {/* Legs */}
        <rect x="64" y="240" width="10" height="20" rx="4" fill="currentColor" opacity="0.15" />
        <rect x="78" y="240" width="10" height="20" rx="4" fill="currentColor" opacity="0.15" />
      </g>

      {/* Decorative elements */}
      <circle cx="330" cy="90" r="4" fill="currentColor" opacity="0.15" />
      <circle cx="350" cy="120" r="3" fill="currentColor" opacity="0.1" />
      <circle cx="100" cy="80" r="3" fill="currentColor" opacity="0.1" />
      <path d="M340 200 L345 195 L350 200 L345 205 Z" fill="currentColor" opacity="0.12" />
    </svg>
  );
};
