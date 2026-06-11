import React from 'react';

interface IllustrationProps {
  className?: string;
}

/** A person celebrating with confetti — used after successful booking */
export const SuccessIllustration: React.FC<IllustrationProps> = ({ className = '' }) => {
  return (
    <svg
      viewBox="0 0 250 250"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full h-auto ${className}`}
      role="img"
      aria-label="Success celebration illustration"
    >
      <style>{`
        @keyframes confettiFall1 {
          0% { transform: translateY(0) rotate(0deg); opacity: 0.6; }
          100% { transform: translateY(20px) rotate(180deg); opacity: 0; }
        }
        @keyframes confettiFall2 {
          0% { transform: translateY(0) rotate(0deg); opacity: 0.5; }
          100% { transform: translateY(25px) rotate(-120deg); opacity: 0; }
        }
        @keyframes confettiFall3 {
          0% { transform: translateY(0) rotate(0deg); opacity: 0.7; }
          100% { transform: translateY(18px) rotate(90deg); opacity: 0; }
        }
        @keyframes celebBounce {
          0%, 100% { transform: translateY(0); }
          30% { transform: translateY(-8px); }
          60% { transform: translateY(-3px); }
        }
        .confetti-1 { animation: confettiFall1 2s ease-in infinite; }
        .confetti-2 { animation: confettiFall2 2.5s ease-in infinite 0.3s; }
        .confetti-3 { animation: confettiFall3 1.8s ease-in infinite 0.6s; }
        .celeb-person { animation: celebBounce 1.5s ease-in-out infinite; }
      `}</style>

      {/* Confetti particles */}
      <rect x="50" y="30" width="8" height="4" rx="1" fill="currentColor" opacity="0.4" className="confetti-1" />
      <rect x="90" y="20" width="6" height="6" rx="1" fill="currentColor" opacity="0.3" className="confetti-2" />
      <rect x="150" y="25" width="8" height="4" rx="1" fill="currentColor" opacity="0.35" className="confetti-3" />
      <rect x="180" y="35" width="5" height="5" rx="1" fill="currentColor" opacity="0.3" className="confetti-1" />
      <rect x="70" y="45" width="6" height="3" rx="1" fill="currentColor" opacity="0.25" className="confetti-2" />
      <rect x="200" y="20" width="7" height="4" rx="1" fill="currentColor" opacity="0.3" className="confetti-3" />
      <circle cx="110" cy="35" r="3" fill="currentColor" opacity="0.3" className="confetti-1" />
      <circle cx="170" cy="40" r="2" fill="currentColor" opacity="0.25" className="confetti-2" />
      <circle cx="60" cy="55" r="2.5" fill="currentColor" opacity="0.2" className="confetti-3" />

      {/* Person celebrating */}
      <g className="celeb-person">
        {/* Shadow */}
        <ellipse cx="125" cy="235" rx="35" ry="7" fill="currentColor" opacity="0.08" />

        {/* Body */}
        <path d="M105 155 C105 143, 145 143, 145 155 L148 225 L102 225 Z" fill="currentColor" opacity="0.15" />
        
        {/* Head */}
        <circle cx="125" cy="115" r="24" fill="currentColor" opacity="0.18" />
        
        {/* Hair */}
        <path d="M101 108 C103 88, 147 88, 149 108" fill="currentColor" opacity="0.25" />
        
        {/* Happy face */}
        <circle cx="117" cy="112" r="2.5" fill="currentColor" opacity="0.3" />
        <circle cx="133" cy="112" r="2.5" fill="currentColor" opacity="0.3" />
        <path d="M115 125 Q125 133, 135 125" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.3" />

        {/* Arms raised in celebration */}
        <path d="M105 160 Q85 140, 75 100" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.18" />
        <path d="M145 160 Q165 140, 175 100" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.18" />
        
        {/* Hands */}
        <circle cx="75" cy="98" r="7" fill="currentColor" opacity="0.15" />
        <circle cx="175" cy="98" r="7" fill="currentColor" opacity="0.15" />

        {/* Legs */}
        <rect x="110" y="218" width="12" height="18" rx="4" fill="currentColor" opacity="0.12" />
        <rect x="128" y="218" width="12" height="18" rx="4" fill="currentColor" opacity="0.12" />
      </g>

      {/* Large checkmark circle */}
      <circle cx="125" cy="70" r="20" fill="currentColor" opacity="0.12" />
      <path d="M115 70 L122 77 L137 62" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />

      {/* Star bursts */}
      <path d="M45 90 L48 85 L51 90 L48 95 Z" fill="currentColor" opacity="0.15" />
      <path d="M205 85 L208 80 L211 85 L208 90 Z" fill="currentColor" opacity="0.15" />
      <path d="M55 150 L57 147 L59 150 L57 153 Z" fill="currentColor" opacity="0.1" />
      <path d="M195 145 L197 142 L199 145 L197 148 Z" fill="currentColor" opacity="0.1" />
    </svg>
  );
};
