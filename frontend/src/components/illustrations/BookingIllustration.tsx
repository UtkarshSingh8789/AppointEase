import React from 'react';

interface IllustrationProps {
  className?: string;
}

/** A person tapping on a phone/tablet to book an appointment */
export const BookingIllustration: React.FC<IllustrationProps> = ({ className = '' }) => {
  return (
    <svg
      viewBox="0 0 200 250"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full h-auto ${className}`}
      role="img"
      aria-label="Person booking an appointment on a device"
    >
      <style>{`
        @keyframes tapPulse {
          0%, 100% { opacity: 0.3; r: 4; }
          50% { opacity: 0.6; r: 6; }
        }
        .tap-indicator { animation: tapPulse 1.5s ease-in-out infinite; }
      `}</style>

      {/* Shadow */}
      <ellipse cx="100" cy="240" rx="45" ry="8" fill="currentColor" opacity="0.08" />

      {/* Person body */}
      <path d="M55 160 C55 148, 95 148, 95 160 L98 235 L52 235 Z" fill="currentColor" opacity="0.15" />
      
      {/* Head */}
      <circle cx="75" cy="125" r="22" fill="currentColor" opacity="0.18" />
      
      {/* Hair */}
      <path d="M53 120 C55 100, 95 100, 97 120" fill="currentColor" opacity="0.25" />
      
      {/* Face */}
      <circle cx="68" cy="123" r="2" fill="currentColor" opacity="0.3" />
      <circle cx="82" cy="123" r="2" fill="currentColor" opacity="0.3" />
      <path d="M70 132 Q75 135, 80 132" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.2" />

      {/* Arms holding phone */}
      <path d="M95 165 Q110 170, 120 160" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.15" />
      <path d="M55 165 Q70 175, 115 165" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.12" />

      {/* Phone/tablet */}
      <rect x="110" y="130" width="55" height="90" rx="8" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="1.5" />
      
      {/* Phone screen */}
      <rect x="115" y="140" width="45" height="70" rx="4" fill="currentColor" opacity="0.05" />
      
      {/* Time slots on phone */}
      <rect x="120" y="145" width="35" height="8" rx="2" fill="currentColor" opacity="0.1" />
      <rect x="120" y="157" width="35" height="8" rx="2" fill="currentColor" opacity="0.1" />
      <rect x="120" y="169" width="35" height="8" rx="2" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1" />
      <rect x="120" y="181" width="35" height="8" rx="2" fill="currentColor" opacity="0.1" />
      <rect x="120" y="193" width="35" height="8" rx="2" fill="currentColor" opacity="0.1" />

      {/* Tap indicator on selected slot */}
      <circle cx="137" cy="173" className="tap-indicator" fill="currentColor" />

      {/* Checkmark on selected slot */}
      <path d="M148 170 L151 173 L156 167" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />

      {/* Legs */}
      <rect x="62" y="225" width="12" height="18" rx="4" fill="currentColor" opacity="0.12" />
      <rect x="80" y="225" width="12" height="18" rx="4" fill="currentColor" opacity="0.12" />

      {/* Decorative dots */}
      <circle cx="170" cy="125" r="3" fill="currentColor" opacity="0.1" />
      <circle cx="180" cy="140" r="2" fill="currentColor" opacity="0.08" />
      <circle cx="45" cy="155" r="2" fill="currentColor" opacity="0.08" />
    </svg>
  );
};
